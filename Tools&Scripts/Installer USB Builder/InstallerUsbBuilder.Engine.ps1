# Installer USB Builder - engine
#
# Dot-source this file; every function can also be used on its own. The design and the decisions
# behind it are in "md documents\Assessments & Plans\Installer USB Builder - Plan.md" (D1-D10,
# U1-U17). This file holds the parts that do not depend on the Lab's open questions:
#
#   - network check, order lookup in SVN, fresh export of the order's software at one revision
#   - core / plugin release lookup on \\build and in the historical archive
#   - USB stick enumeration, erase, label, write and read-back verification
#   - Invoke-IubUpgradeUsb: the "Software upgrade USB" side function (U14-U17)
#
# Rules: software comes from SVN only (never from C:\SPD_Projects). Everything is collected and
# checked in a local staging folder first; the stick is only touched when nothing critical is
# missing (U5). Functions that write outside the staging folder honour -WhatIf.
#
# PowerShell 5.1. Saved as UTF-8 with BOM; keep string literals ASCII (SCRIPTING-GOTCHAS.md).

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
# Loaded up front: auto-loading it during a -WhatIf run prints a "What if" line per alias.
# (Import-Module has no -WhatIf, so the preference is switched off in a child scope instead.)
& { $WhatIfPreference = $false; Import-Module CimCmdlets -Global -ErrorAction SilentlyContinue }

function Get-IubConfig {
    [pscustomobject]@{
        SvnTrunkUrl = 'https://172.16.0.17/svn/SPD_Projects/trunk/'
        SvnOptions  = @('--non-interactive', '--config-option', 'servers:global:http-timeout=60')
        # Searched in this order; the first location holding a version wins.
        CoreRoots   = @(
            [pscustomobject]@{ Location = 'Release';            Path = '\\build\Release\Robotics Core' }
            [pscustomobject]@{ Location = 'Archive';            Path = '\\build\Release\Robotics Core\Archive' }
            [pscustomobject]@{ Location = 'Historical archive'; Path = '\\fileserver\Data RnD\_ARCHIEF R&D\4.PC Software\Historisch\Robotics\Robotics Core' }
        )
        PluginRoots = @(
            [pscustomobject]@{ Location = 'Release';            Path = '\\build\Release\Robotics Plugin' }
            [pscustomobject]@{ Location = 'Archive';            Path = '\\build\Release\Robotics Plugin\Archive' }
            [pscustomobject]@{ Location = 'Historical archive'; Path = '\\fileserver\Data RnD\_ARCHIEF R&D\4.PC Software\Historisch\Robotics\Robotics Plugin' }
        )
        StagingRoot = Join-Path $env:TEMP 'InstallerUsbBuilder'
        CoreExe     = 'SkalarRobotics.exe'
    }
}

function New-IubItem {
    # One line in the results window. Failed = critical (U7/U17), Warning = look at it, Info = FYI.
    param(
        [Parameter(Mandatory)][ValidateSet('Failed', 'Warning', 'Info')][string]$Severity,
        [Parameter(Mandatory)][string]$Text,
        [string]$Detail = ''
    )
    [pscustomobject]@{ Severity = $Severity; Text = $Text; Detail = $Detail }
}

# ---------------------------------------------------------------------------------------------
# Network and SVN
# ---------------------------------------------------------------------------------------------

function Test-IubTcp {
    param([Parameter(Mandatory)][string]$HostName, [Parameter(Mandatory)][int]$Port, [int]$TimeoutMs = 3000)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($HostName, $Port, $null, $null)
        if (-not $iar.AsyncWaitHandle.WaitOne($TimeoutMs)) { return $false }
        $client.EndConnect($iar)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Test-IubNetwork {
    # Says which of the places the tool needs can't be reached, before anything runs (U3).
    # Returns one row per check: Name, Ok, Required, Detail.
    param([switch]$IncludeOrdersShare)
    $cfg = Get-IubConfig
    $rows = New-Object System.Collections.Generic.List[object]

    $svn = Get-Command svn.exe -ErrorAction SilentlyContinue
    $rows.Add([pscustomobject]@{
        Name = 'SVN client'; Required = $true; Ok = [bool]$svn
        Detail = $(if ($svn) { $svn.Source } else { 'svn.exe not found: install the TortoiseSVN "command line client tools"' })
    })

    $svnHost = ([Uri]$cfg.SvnTrunkUrl).Host
    $ok = Test-IubTcp -HostName $svnHost -Port 443
    $rows.Add([pscustomobject]@{
        Name = 'SVN server'; Required = $true; Ok = $ok
        Detail = $(if ($ok) { $cfg.SvnTrunkUrl } else { "$svnHost port 443 not reachable (VPN / lab network?)" })
    })

    $shares = @(
        [pscustomobject]@{ Name = 'Build server'; Host = 'build'; Path = '\\build\Release'; Required = $true }
        [pscustomobject]@{ Name = 'Historical archive'; Host = 'fileserver'; Path = $cfg.PluginRoots[2].Path; Required = $false }
    )
    if ($IncludeOrdersShare) {
        $shares += [pscustomobject]@{ Name = 'Orders share'; Host = 'fileserver'; Path = '\\fileserver\Orders\01. Orders'; Required = $true }
    }
    foreach ($s in $shares) {
        # A TCP probe first: Directory.Exists on an unreachable UNC path can hang for half a minute.
        $ok = (Test-IubTcp -HostName $s.Host -Port 445) -and [System.IO.Directory]::Exists($s.Path)
        $rows.Add([pscustomobject]@{
            Name = $s.Name; Required = $s.Required; Ok = $ok
            Detail = $(if ($ok) { $s.Path } else { "$($s.Path) not reachable" })
        })
    }
    $rows.ToArray()
}

function ConvertTo-IubArgument {
    # Windows command-line quoting for one argument (ProcessStartInfo.Arguments is a single string).
    param([string]$Value)
    if ($Value -notmatch '[\s"]') { return $Value }
    $escaped = $Value -replace '(\\*)"', '$1$1\"'
    $escaped = $escaped -replace '(\\+)$', '$1$1'
    return '"' + $escaped + '"'
}

function Format-IubSvnError {
    param([string]$Command, [string]$StdErr)
    $text = ($StdErr -split "`r?`n" | Where-Object { $_.Trim() }) -join ' '
    if ($text -match 'E170013|E731001|E120108|E175012|Unable to connect|timed out') {
        return "SVN server not reachable ($Command): $text"
    }
    if ($text -match 'E215004|E170001|[Aa]uthenti|[Aa]uthori') {
        return "SVN refused the login on this PC ($Command). Store the SVN credentials once (open any SVN folder with TortoiseSVN and log in), then retry. svn said: $text"
    }
    return "svn $Command failed: $text"
}

function Invoke-IubSvn {
    # Runs svn with the workspace's common options and returns stdout as one string.
    # Use --xml for anything that is parsed: svn writes XML as UTF-8, plain output in the console code page.
    param([Parameter(Mandatory)][string[]]$Arguments, [int]$TimeoutSeconds = 900)
    if (-not (Get-Command svn.exe -ErrorAction SilentlyContinue)) {
        throw 'svn.exe not found: install the TortoiseSVN "command line client tools".'
    }
    $cfg = Get-IubConfig
    $all = @($Arguments) + @($cfg.SvnOptions)
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'svn.exe'
    $psi.Arguments = (@($all | ForEach-Object { ConvertTo-IubArgument $_ })) -join ' '
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8
    $p = [System.Diagnostics.Process]::Start($psi)
    try {
        $outTask = $p.StandardOutput.ReadToEndAsync()
        $errTask = $p.StandardError.ReadToEndAsync()
        if (-not $p.WaitForExit($TimeoutSeconds * 1000)) {
            try { $p.Kill() } catch { }
            throw "svn $($Arguments[0]) did not finish within $TimeoutSeconds s (network stalled?)."
        }
        $p.WaitForExit()
        if ($p.ExitCode -ne 0) { throw (Format-IubSvnError -Command $Arguments[0] -StdErr $errTask.Result) }
        return $outTask.Result
    } finally {
        $p.Dispose()
    }
}

function Join-IubUrl {
    # Appends path segments (unescaped names as svn list prints them) to an SVN URL.
    param([Parameter(Mandatory)][string]$BaseUrl, [Parameter(Mandatory)][string[]]$Segment)
    $url = $BaseUrl.TrimEnd('/')
    foreach ($s in $Segment) { $url += '/' + [Uri]::EscapeDataString($s) }
    return $url
}

function Get-IubSvnDirectories {
    param([Parameter(Mandatory)][string]$Url)
    [xml]$x = Invoke-IubSvn -Arguments @('list', '--xml', $Url)
    $names = @($x.lists.list.entry | Where-Object { $_.kind -eq 'dir' } | ForEach-Object { $_.name })
    $names
}

function Test-IubApplicationFolder {
    # An application folder is recognised by its content, not its name: it holds
    # Applications.TreeDatabase.Xml and a SkalarPacks folder. Names vary on older orders
    # ("99339531", "99287117 14121", "99316128_Grond_(4x8) na service", "... 216104 BOD"), and
    # the order folder can also hold "Titrator files", "Methods and settings backup", "WSSPIP", ...
    param([Parameter(Mandatory)][string]$Url)
    [xml]$x = Invoke-IubSvn -Arguments @('list', '--xml', $Url)
    $entries = @($x.lists.list.entry)
    $hasTree = @($entries | Where-Object { $_.kind -eq 'file' -and $_.name -eq 'Applications.TreeDatabase.Xml' }).Count -gt 0
    $hasPacks = @($entries | Where-Object { $_.kind -eq 'dir' -and $_.name -eq 'SkalarPacks' }).Count -gt 0
    return ($hasTree -and $hasPacks)
}

function Get-IubSerialFromFolderName {
    # "99445669 266698" -> 266698, "99287117 14121" -> 14121, "99367208 216104 BOD" -> 216104,
    # "99339531" -> $null (older orders carry no serial in the name).
    param([Parameter(Mandatory)][string]$Name)
    if ($Name -match '^\d{8}[ _]+(\d{5,6})(?=$|[ _])') { return $Matches[1] }
    return $null
}

function Resolve-IubOrder {
    # Order number -> its SVN trunk folder, application folder(s), serial and last commit.
    # The revision returned is the one everything is exported at, so bin and software always match.
    # An order can have more than one application folder sharing one bin (e.g. a BOD and a WATERS
    # application); ApplicationFolders lists them all.
    param([Parameter(Mandatory)][ValidatePattern('^\d{8}$')][string]$OrderNumber)
    $cfg = Get-IubConfig

    $folders = @(Get-IubSvnDirectories -Url $cfg.SvnTrunkUrl)
    $hits = @($folders | Where-Object { $_ -eq $OrderNumber -or $_.StartsWith("$OrderNumber ") })
    if ($hits.Count -eq 0) { throw "Order $OrderNumber is not in SVN trunk ($($cfg.SvnTrunkUrl))." }
    if ($hits.Count -gt 1) { throw "Order $OrderNumber matches more than one SVN trunk folder: $($hits -join '; ')." }
    $folder = $hits[0]
    $folderUrl = Join-IubUrl -BaseUrl $cfg.SvnTrunkUrl -Segment $folder

    $children = @(Get-IubSvnDirectories -Url $folderUrl)
    if ($children -notcontains 'bin') {
        throw "'$folder' has no bin folder in SVN, so it is an older layout this tool does not handle (folders: $($children -join '; '))."
    }
    $apps = New-Object System.Collections.Generic.List[string]
    $others = New-Object System.Collections.Generic.List[string]
    foreach ($child in $children) {
        if ($child -eq 'bin') { continue }
        if (Test-IubApplicationFolder -Url (Join-IubUrl -BaseUrl $folderUrl -Segment $child)) { $apps.Add($child) } else { $others.Add($child) }
    }
    if ($apps.Count -eq 0) {
        throw "No application folder in '$folder' (one holding Applications.TreeDatabase.Xml and SkalarPacks). Folders: $($children -join '; ')."
    }
    $serial = $null
    foreach ($a in $apps) { if (-not $serial) { $serial = Get-IubSerialFromFolderName -Name $a } }

    [xml]$log = Invoke-IubSvn -Arguments @('log', '--xml', '-l', '1', $folderUrl)
    $entry = $log.log.logentry
    $message = ''
    if ($entry.msg) { $message = ([string]$entry.msg).Trim() }

    [pscustomobject]@{
        OrderNumber        = $OrderNumber
        FolderName         = $folder
        FolderUrl          = $folderUrl
        ApplicationFolders = $apps.ToArray()
        OtherFolders       = $others.ToArray()
        Serial             = $serial
        Revision           = [int]$entry.revision
        Author             = [string]$entry.author
        Date               = [datetime]$entry.date
        Message            = $message
    }
}

function ConvertFrom-IubVersionInfo {
    # Parses binAndPluginsInfo.txt: "Bin: 1.143.2.0" / "Plugins: 1.79.3.0", or the older form,
    # a bare bin version on one line ("1.132.0.0", seen on 99367208) with no plugins line.
    param([string]$Text)
    $bin = $null; $plugins = $null; $bare = $null
    foreach ($line in ($Text -split "`r?`n")) {
        if ($line -match '^\s*Bin\s*:\s*([\d.]+)') { $bin = $Matches[1] }
        elseif ($line -match '^\s*Plugins\s*:\s*([\d.]+)') { $plugins = $Matches[1] }
        elseif (-not $bare -and $line -match '^\s*(\d+(?:\.\d+){1,3})\s*$') { $bare = $Matches[1] }
    }
    if (-not $bin -and $bare) { $bin = $bare }
    [pscustomobject]@{ BinVersion = $bin; PluginsVersion = $plugins }
}

function Get-IubSoftwareInfo {
    # The order's own versions, read straight from SVN (no export needed) for the confirmation screen.
    # Older software has no binAndPluginsInfo.txt; Found is then $false.
    param([Parameter(Mandatory)]$Order, [string]$ApplicationFolder)
    if (-not $ApplicationFolder) { $ApplicationFolder = $Order.ApplicationFolders[0] }
    $url = (Join-IubUrl -BaseUrl $Order.FolderUrl -Segment @($ApplicationFolder, 'binAndPluginsInfo.txt')) + "@$($Order.Revision)"
    try {
        $text = Invoke-IubSvn -Arguments @('cat', $url)
    } catch {
        return [pscustomobject]@{ BinVersion = $null; PluginsVersion = $null; Found = $false }
    }
    $info = ConvertFrom-IubVersionInfo -Text $text
    $info | Add-Member -NotePropertyName Found -NotePropertyValue $true
    return $info
}

function Export-IubSoftware {
    # Fresh export (no .svn) of the order's bin and the chosen application folder(s), all at the
    # order's revision. This is what the reference application zips contain (finding 12: never the
    # working copy). Default: every application folder.
    param([Parameter(Mandatory)]$Order, [Parameter(Mandatory)][string]$Destination, [string[]]$ApplicationFolders)
    if (-not $ApplicationFolders) { $ApplicationFolders = $Order.ApplicationFolders }
    foreach ($a in $ApplicationFolders) {
        if ($Order.ApplicationFolders -notcontains $a) { throw "'$a' is not an application folder of order $($Order.OrderNumber)." }
    }
    if (Test-Path -LiteralPath $Destination) { throw "Export destination already exists: $Destination" }
    # Staging writes always happen, also under -WhatIf (which only guards the stick).
    [void][System.IO.Directory]::CreateDirectory($Destination)
    $rev = $Order.Revision
    foreach ($name in @('bin') + @($ApplicationFolders)) {
        $url = (Join-IubUrl -BaseUrl $Order.FolderUrl -Segment $name) + "@$rev"
        [void](Invoke-IubSvn -Arguments @('export', '-q', '-r', "$rev", $url, (Join-Path $Destination $name)))
    }
    [pscustomobject]@{
        BinDir          = Join-Path $Destination 'bin'
        ApplicationDirs = @($ApplicationFolders | ForEach-Object { [pscustomobject]@{ Name = $_; Dir = (Join-Path $Destination $_) } })
    }
}

function New-IubZip {
    # Zip with the source folder as its single top folder, as "Send to > Compressed folder" makes it.
    # Entries are added one by one with '/' separators: ZipFile.CreateFromDirectory under Windows
    # PowerShell 5.1 (.NET Framework) writes '\', which other unzip tools take as part of the name.
    param([Parameter(Mandatory)][string]$SourceDir, [Parameter(Mandatory)][string]$ZipPath)
    if ([System.IO.File]::Exists($ZipPath)) { [System.IO.File]::Delete($ZipPath) }
    [void][System.IO.Directory]::CreateDirectory((Split-Path -Parent $ZipPath))
    $src = (Get-IubRootPath -Path $SourceDir).TrimEnd('\')   # never a drive root here: it has a leaf name
    $top = Split-Path -Leaf $src
    $level = [System.IO.Compression.CompressionLevel]::Optimal
    $stream = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::CreateNew)
    $zip = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        [void]$zip.CreateEntry("$top/")
        foreach ($dir in [System.IO.Directory]::GetDirectories($src, '*', [System.IO.SearchOption]::AllDirectories)) {
            # Only empty folders need their own entry; the others are implied by their files.
            if (@([System.IO.Directory]::GetFileSystemEntries($dir)).Count -eq 0) {
                [void]$zip.CreateEntry("$top/" + $dir.Substring($src.Length + 1).Replace('\', '/') + '/')
            }
        }
        foreach ($file in [System.IO.Directory]::GetFiles($src, '*', [System.IO.SearchOption]::AllDirectories)) {
            $name = "$top/" + $file.Substring($src.Length + 1).Replace('\', '/')
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file, $name, $level)
        }
    } finally {
        $zip.Dispose()
        $stream.Dispose()
    }
    return Get-Item -LiteralPath $ZipPath
}

# ---------------------------------------------------------------------------------------------
# Core and plugin releases
# ---------------------------------------------------------------------------------------------

function ConvertTo-IubReleaseVersion {
    # "1.143.2.0" -> "1.143.2", "1.143.0.0" -> "1.143": the release zips drop trailing zeros.
    param([Parameter(Mandatory)][string]$Version)
    $parts = @($Version.Trim() -split '\.')
    while ($parts.Count -gt 2 -and $parts[-1] -eq '0') { $parts = $parts[0..($parts.Count - 2)] }
    return ($parts -join '.')
}

function Get-IubReleases {
    # Every "Robotics <Kind> <ver> Release.zip" in the release folder, its Archive and the historical
    # archive, newest first. A version found in several places is listed once, at the first location.
    param([Parameter(Mandatory)][ValidateSet('Core', 'Plugin')][string]$Kind)
    $cfg = Get-IubConfig
    $roots = if ($Kind -eq 'Core') { $cfg.CoreRoots } else { $cfg.PluginRoots }
    $seen = @{}
    $list = New-Object System.Collections.Generic.List[object]
    $pattern = "^Robotics $Kind (\d+(?:\.\d+)+) Release\.zip$"
    foreach ($root in $roots) {
        try {
            if (-not [System.IO.Directory]::Exists($root.Path)) { continue }
            $files = [System.IO.Directory]::GetFiles($root.Path, "Robotics $Kind * Release.zip")
        } catch { continue }
        foreach ($f in $files) {
            $name = [System.IO.Path]::GetFileName($f)
            if ($name -notmatch $pattern) { continue }
            $v = $Matches[1]
            if ($seen.ContainsKey($v)) { continue }
            $seen[$v] = $true
            $list.Add([pscustomobject]@{ Version = $v; SortKey = [version]$v; Location = $root.Location; Path = $f })
        }
    }
    $sorted = @($list | Sort-Object -Property SortKey -Descending)
    for ($i = 0; $i -lt $sorted.Count; $i++) {
        $sorted[$i] | Add-Member -NotePropertyName IsLatest -NotePropertyValue ($i -eq 0)
    }
    $sorted
}

function Find-IubRelease {
    # The release zip for one version, or $null. Accepts "1.143.2.0" as well as "1.143.2".
    param([Parameter(Mandatory)][ValidateSet('Core', 'Plugin')][string]$Kind, [Parameter(Mandatory)][string]$Version)
    # Normalise both sides: a few old zips keep a trailing ".0" in their name ("1.1.25.0").
    $want = ConvertTo-IubReleaseVersion -Version $Version
    $hit = @(Get-IubReleases -Kind $Kind | Where-Object { (ConvertTo-IubReleaseVersion $_.Version) -eq $want })
    if ($hit.Count -gt 0) { return $hit[0] }
    return $null
}

# ---------------------------------------------------------------------------------------------
# USB stick
# ---------------------------------------------------------------------------------------------

function Get-IubRemovableDrives {
    # Removable drives with a medium in them (U4). Never the system drive.
    $sys = $env:SystemDrive
    $drives = @(Get-CimInstance -ClassName Win32_LogicalDisk -Filter 'DriveType=2' -ErrorAction SilentlyContinue |
        Where-Object { $_.Size -and $_.DeviceID -ne $sys } |
        ForEach-Object {
            $size = [int64]$_.Size
            $free = [int64]$_.FreeSpace
            $label = [string]$_.VolumeName
            [pscustomobject]@{
                Letter     = $_.DeviceID
                Root       = "$($_.DeviceID)\"
                Label      = $label
                FileSystem = [string]$_.FileSystem
                SizeBytes  = $size
                FreeBytes  = $free
                Display    = ('{0}  {1:N1} GB  {2}  "{3}"  ({4:N0} MB used)' -f $_.DeviceID, ($size / 1GB), $_.FileSystem, $label, (($size - $free) / 1MB))
            }
        })
    $drives
}

function Assert-IubTargetDrive {
    # Re-checks, right before writing, that the target is still a removable drive and not the PC.
    param([Parameter(Mandatory)][string]$Root)
    $letter = $Root.Substring(0, 2).ToUpperInvariant()
    $drive = @(Get-IubRemovableDrives | Where-Object { $_.Letter -eq $letter })
    if ($drive.Count -eq 0) { throw "$letter is not a removable drive with a medium in it (unplugged?)." }
    $here = $PSScriptRoot
    if ($here -and $here.ToUpperInvariant().StartsWith($letter)) { throw "Refusing to erase $letter : the tool itself runs from it." }
    return $drive[0]
}

function Get-IubTreeSize {
    param([Parameter(Mandatory)][string]$Path)
    $sum = 0
    foreach ($f in [System.IO.Directory]::GetFiles($Path, '*', [System.IO.SearchOption]::AllDirectories)) {
        $sum += (New-Object System.IO.FileInfo $f).Length
    }
    return [int64]$sum
}

function Clear-IubTarget {
    # Deletes everything on the stick (or test folder) except the volume's own system folders.
    # A delete rather than a format: formatting needs admin rights (plan U-c).
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][string]$Root)
    $keep = @('System Volume Information', '$RECYCLE.BIN')
    foreach ($child in @(Get-ChildItem -LiteralPath $Root -Force)) {
        if ($keep -contains $child.Name) { continue }
        if ($PSCmdlet.ShouldProcess($child.FullName, 'Delete')) {
            Remove-Item -LiteralPath $child.FullName -Recurse -Force -ErrorAction Stop
        }
    }
}

function Get-IubRootPath {
    # Full path of a folder, always ending in exactly one '\'. Relative paths are then
    # Substring($root.Length). Never trim a drive root to "E:": to Windows that means "the current
    # folder on drive E", and everything listed under it comes back as "E:Application\..." - which
    # made the read-back report the stick's own files as "extra: pplication\..." (99339531, 2026-10-07).
    param([Parameter(Mandatory)][string]$Path)
    $full = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $Path).ProviderPath)
    if (-not $full.EndsWith('\')) { $full += '\' }
    return $full
}

function Copy-IubTree {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][string]$Source, [Parameter(Mandatory)][string]$Destination, [scriptblock]$OnFile)
    $srcRoot = Get-IubRootPath -Path $Source
    foreach ($dir in [System.IO.Directory]::GetDirectories($srcRoot, '*', [System.IO.SearchOption]::AllDirectories)) {
        $target = Join-Path $Destination $dir.Substring($srcRoot.Length)
        if ($PSCmdlet.ShouldProcess($target, 'Create folder')) { [void][System.IO.Directory]::CreateDirectory($target) }
    }
    foreach ($file in [System.IO.Directory]::GetFiles($srcRoot, '*', [System.IO.SearchOption]::AllDirectories)) {
        $rel = $file.Substring($srcRoot.Length)
        $target = Join-Path $Destination $rel
        if ($PSCmdlet.ShouldProcess($target, 'Copy')) {
            if ($OnFile) { & $OnFile $rel }
            [System.IO.File]::Copy($file, $target, $true)
        }
    }
}

function Get-IubFileHash {
    param([Parameter(Mandatory)][string]$Path)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $stream = [System.IO.File]::OpenRead($Path)
    try { return [BitConverter]::ToString($sha.ComputeHash($stream)) } finally { $stream.Dispose(); $sha.Dispose() }
}

function Compare-IubTree {
    # Read-back verification: every file in Reference must be in Target with the same SHA-256, and
    # Target must hold nothing else (apart from the volume's own system folders).
    # Emits the differences; none means identical. Wrap the call in @().
    param([Parameter(Mandatory)][string]$Reference, [Parameter(Mandatory)][string]$Target)
    $refRoot = Get-IubRootPath -Path $Reference
    $tgtRoot = Get-IubRootPath -Path $Target
    $ignore = '^(System Volume Information|\$RECYCLE\.BIN)(\\|$)'
    $diff = New-Object System.Collections.Generic.List[string]
    $refFiles = @{}
    foreach ($f in [System.IO.Directory]::GetFiles($refRoot, '*', [System.IO.SearchOption]::AllDirectories)) {
        $refFiles[$f.Substring($refRoot.Length).ToLowerInvariant()] = $f
    }
    foreach ($rel in $refFiles.Keys) {
        $t = Join-Path $tgtRoot $rel
        if (-not [System.IO.File]::Exists($t)) { $diff.Add("missing: $rel"); continue }
        if ((Get-IubFileHash $refFiles[$rel]) -ne (Get-IubFileHash $t)) { $diff.Add("differs: $rel") }
    }
    foreach ($entry in [System.IO.Directory]::GetFileSystemEntries($tgtRoot)) {
        $name = [System.IO.Path]::GetFileName($entry)
        if ($name -match $ignore) { continue }
        if ([System.IO.File]::Exists($entry)) {
            if (-not $refFiles.ContainsKey($name.ToLowerInvariant())) { $diff.Add("extra: $name") }
            continue
        }
        foreach ($f in [System.IO.Directory]::GetFiles($entry, '*', [System.IO.SearchOption]::AllDirectories)) {
            $rel = $f.Substring($tgtRoot.Length)
            if (-not $refFiles.ContainsKey($rel.ToLowerInvariant())) { $diff.Add("extra: $rel") }
        }
    }
    $diff.ToArray()
}

function Set-IubVolumeLabel {
    # Tries the label without admin rights first. Returns Ok/Method/Error; never throws (plan U-c).
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][string]$Letter, [Parameter(Mandatory)][string]$Label)
    $letter = $Letter.Substring(0, 1).ToUpperInvariant()
    if (-not $PSCmdlet.ShouldProcess("${letter}:", "Set label '$Label'")) {
        return [pscustomobject]@{ Ok = $false; Method = 'WhatIf'; Error = '' }
    }
    $read = { [string](Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='${letter}:'").VolumeName }
    $errors = New-Object System.Collections.Generic.List[string]
    $attempts = @(
        @{ Name = 'Set-Volume'; Do = { Set-Volume -DriveLetter $letter -NewFileSystemLabel $Label -ErrorAction Stop } }
        @{ Name = 'Win32_Volume'; Do = {
                $v = Get-CimInstance -ClassName Win32_Volume -Filter "DriveLetter='${letter}:'" -ErrorAction Stop
                Set-CimInstance -InputObject $v -Property @{ Label = $Label } -ErrorAction Stop } }
        @{ Name = 'Shell'; Do = {
                $shell = New-Object -ComObject Shell.Application
                $shell.NameSpace(17).ParseName("${letter}:\").Name = $Label } }
    )
    foreach ($a in $attempts) {
        try {
            & $a.Do | Out-Null
            Start-Sleep -Milliseconds 300
            if ((& $read) -eq $Label) { return [pscustomobject]@{ Ok = $true; Method = $a.Name; Error = '' } }
            $errors.Add("$($a.Name): no effect")
        } catch {
            $errors.Add("$($a.Name): $($_.Exception.Message)")
        }
    }
    return [pscustomobject]@{ Ok = $false; Method = ''; Error = ($errors -join ' | ') }
}

# ---------------------------------------------------------------------------------------------
# Software upgrade USB (U14-U17)
# ---------------------------------------------------------------------------------------------

function Get-IubUpgradeSteps {
    # Step ids and captions, in order, for the progress window. 'line' is the "nothing written above" marker.
    @(
        [pscustomobject]@{ Id = 'network';  Caption = 'Network: SVN, build server' }
        [pscustomobject]@{ Id = 'order';    Caption = 'Order in SVN' }
        [pscustomobject]@{ Id = 'software'; Caption = 'Software export' }
        [pscustomobject]@{ Id = 'core';     Caption = 'Core (bin)' }
        [pscustomobject]@{ Id = 'plugin';   Caption = 'Plugin installer' }
        [pscustomobject]@{ Id = 'stage';    Caption = 'Assemble USB content' }
        [pscustomobject]@{ Id = 'line';     Caption = '---- nothing written above this line ----' }
        [pscustomobject]@{ Id = 'erase';    Caption = 'Erase USB' }
        [pscustomobject]@{ Id = 'write';    Caption = 'Write USB' }
        [pscustomobject]@{ Id = 'label';    Caption = 'Label USB' }
        [pscustomobject]@{ Id = 'verify';   Caption = 'Verify USB (read back)' }
    )
}

function Invoke-IubUpgradeUsb {
    <#
    .SYNOPSIS
    Builds a Software upgrade USB: the plugin release zip's layout at the stick's root, plus
    Application\<order> <serial>.zip and Core\bin.zip from SVN HEAD of the order. Label = order number.

    .DESCRIPTION
    Everything is collected in a staging folder under %TEMP% first. The stick is only erased and
    written when nothing critical is missing (U5); with -WhatIf it is never touched.
    -TargetIsFolder writes into an ordinary folder instead of a drive (testing): the drive checks
    and the label step are skipped.

    OnStep is called as (id, status, detail) with status running|ok|warning|failed|skipped.
    OnLog is called with one text line. CancelToken is any hashtable; Cancel = $true stops the run
    at the next step boundary before the write line. Once writing started it runs to the end.

    Returns Outcome (Succeeded | Warning | Failed | Cancelled), Items, and what was used.
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)][ValidatePattern('^\d{8}$')][string]$OrderNumber,
        [Parameter(Mandatory)][string]$TargetRoot,
        [string]$PluginVersion,
        # Which application folders go on the stick; default all of them (an order can have several).
        [string[]]$ApplicationFolders,
        [switch]$TargetIsFolder,
        [switch]$KeepStaging,
        [scriptblock]$OnStep,
        [scriptblock]$OnLog,
        [hashtable]$CancelToken
    )
    $cfg = Get-IubConfig
    $items = New-Object System.Collections.Generic.List[object]
    $result = [pscustomobject]@{
        Outcome = $null; Items = $items; Order = $null; Revision = $null; ApplicationFolders = @(); PluginVersion = $null
        PluginLocation = $null; CoreVersion = $null; TargetRoot = $TargetRoot; Label = $OrderNumber
        StagingDir = $null; Written = $false; TestMode = [bool]$WhatIfPreference
    }
    $current = $null
    $step = { param($id, $status, $detail) if ($OnStep) { & $OnStep $id $status $detail } }
    $log = { param($text) if ($OnLog) { & $OnLog $text } }
    $begin = { param($id) Set-Variable -Name current -Value $id -Scope 1 -WhatIf:$false; & $step $id 'running' '' }
    $cancelled = { $CancelToken -and $CancelToken['Cancel'] }
    Remove-IubStaleStaging

    # do/while($false) so that 'break' leaves the steps early and $result is still returned.
    do { try {
        # 1. Network --------------------------------------------------------------------------
        & $begin 'network'
        $net = @(Test-IubNetwork)
        foreach ($n in $net) { & $log ("{0,-20} {1}  {2}" -f $n.Name, $(if ($n.Ok) { 'ok' } else { 'NOT REACHABLE' }), $n.Detail) }
        $missing = @($net | Where-Object { -not $_.Ok -and $_.Required })
        foreach ($n in $missing) { $items.Add((New-IubItem Failed "$($n.Name) not reachable" $n.Detail)) }
        if ($missing.Count) { & $step 'network' 'failed' (($missing | ForEach-Object Name) -join ', '); break }
        $optional = @($net | Where-Object { -not $_.Ok -and -not $_.Required })
        & $step 'network' 'ok' $(if ($optional.Count) { 'historical archive not reachable (recent versions only)' } else { '' })
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }

        # 2. Order ----------------------------------------------------------------------------
        & $begin 'order'
        $order = Resolve-IubOrder -OrderNumber $OrderNumber
        $result.Order = $order
        $result.Revision = $order.Revision
        & $log "SVN folder: $($order.FolderName)"
        & $log "Application folder(s): $($order.ApplicationFolders -join '; ')"
        & $log ("Last commit: r{0}  {1:yyyy-MM-dd HH:mm}  {2}  {3}" -f $order.Revision, $order.Date, $order.Author, $order.Message)
        $chosen = if ($ApplicationFolders) { @($ApplicationFolders) } else { @($order.ApplicationFolders) }
        $unknown = @($chosen | Where-Object { $order.ApplicationFolders -notcontains $_ })
        if ($unknown.Count) {
            $items.Add((New-IubItem Failed "Not an application folder of this order: $($unknown -join '; ')" "Application folders: $($order.ApplicationFolders -join '; ')"))
            & $step 'order' 'failed' 'unknown application folder'
            break
        }
        $result.ApplicationFolders = $chosen
        $left = @($order.ApplicationFolders | Where-Object { $chosen -notcontains $_ })
        if ($left.Count) { $items.Add((New-IubItem Info "Application folder(s) left off on purpose: $($left -join '; ')" '')) }
        if ($order.OtherFolders.Count) {
            # The upgrade USB carries applications and bin only (U15); say what else the order holds.
            $items.Add((New-IubItem Info "Not on the USB (not an application folder): $($order.OtherFolders -join '; ')" 'Upgrade USBs carry the application(s) and bin only.'))
        }
        & $step 'order' 'ok' ("r{0}  {1:yyyy-MM-dd}  {2}{3}" -f $order.Revision, $order.Date, $order.Author, $(if ($chosen.Count -gt 1) { "  ($($chosen.Count) applications)" } else { '' }))
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }

        # 3. Software export ------------------------------------------------------------------
        & $begin 'software'
        $staging = Join-Path $cfg.StagingRoot ("{0}-{1:yyyyMMdd-HHmmss}" -f $OrderNumber, (Get-Date))
        $result.StagingDir = $staging
        & $log "Staging folder: $staging"
        $export = Export-IubSoftware -Order $order -Destination (Join-Path $staging 'src') -ApplicationFolders $chosen
        # The order's own version lines come from the first chosen application folder.
        $infoPath = Join-Path $export.ApplicationDirs[0].Dir 'binAndPluginsInfo.txt'
        $info = if (Test-Path -LiteralPath $infoPath) { ConvertFrom-IubVersionInfo -Text (Get-Content -LiteralPath $infoPath -Raw) } else { $null }
        $fileCount = 0
        foreach ($a in $export.ApplicationDirs) {
            $n = @([System.IO.Directory]::GetFiles($a.Dir, '*', [System.IO.SearchOption]::AllDirectories)).Count
            $fileCount += $n
            & $log "Exported r$($order.Revision): $($a.Name), $n files"
        }
        & $log "Exported r$($order.Revision): bin"
        & $step 'software' 'ok' "r$($order.Revision), $fileCount files"
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }

        # 4. Core -----------------------------------------------------------------------------
        & $begin 'core'
        $exe = Join-Path $export.BinDir "Release\$($cfg.CoreExe)"
        $exeVersion = if (Test-Path -LiteralPath $exe) { (Get-Item -LiteralPath $exe).VersionInfo.FileVersion } else { $null }
        $binVersion = if ($info -and $info.BinVersion) { $info.BinVersion } else { $exeVersion }
        if (-not $exeVersion) {
            $items.Add((New-IubItem Failed "bin has no Release\$($cfg.CoreExe)" "The order's bin folder in SVN r$($order.Revision) is incomplete."))
            & $step 'core' 'failed' 'no core in bin'
            break
        }
        if (-not $info) {
            # Older software has no binAndPluginsInfo.txt at all; that is normal, not a warning.
            & $log "No binAndPluginsInfo.txt (older software); core version taken from $($cfg.CoreExe)"
        } elseif (-not $info.BinVersion) {
            $items.Add((New-IubItem Warning 'binAndPluginsInfo.txt has no Bin line' "Core version taken from $($cfg.CoreExe): $exeVersion"))
        } elseif ($info.BinVersion -ne $exeVersion) {
            $items.Add((New-IubItem Warning "binAndPluginsInfo.txt says Bin $($info.BinVersion), but $($cfg.CoreExe) is $exeVersion" 'The file was not updated with the bin. The USB carries the bin as it is in SVN.'))
        }
        $result.CoreVersion = $exeVersion
        $coreRelease = Find-IubRelease -Kind Core -Version $exeVersion
        if ($coreRelease) {
            & $log "Core $exeVersion = $([System.IO.Path]::GetFileName($coreRelease.Path)) ($($coreRelease.Location))"
            & $step 'core' 'ok' "$(ConvertTo-IubReleaseVersion $exeVersion), release ($($coreRelease.Location))"
        } else {
            # U17: on an upgrade USB a non-release core is a warning, not Failed.
            $items.Add((New-IubItem Warning "bin $exeVersion is not a released core" 'Not in the release folder, its Archive or the historical archive. Fine for a test or newer core; make sure that is intended.'))
            & $step 'core' 'warning' "$exeVersion, not a release"
        }
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }

        # 5. Plugin installer -----------------------------------------------------------------
        & $begin 'plugin'
        $plugins = @(Get-IubReleases -Kind Plugin)
        if ($plugins.Count -eq 0) { throw 'No plugin release zip found on the build server or in the archive.' }
        $plugin = if ($PluginVersion) { Find-IubRelease -Kind Plugin -Version $PluginVersion } else { $plugins[0] }
        if (-not $plugin) {
            $items.Add((New-IubItem Failed "Plugin release $PluginVersion not found" 'Not in the release folder, its Archive or the historical archive.'))
            & $step 'plugin' 'failed' "$PluginVersion not found"
            break
        }
        $result.PluginVersion = $plugin.Version
        $result.PluginLocation = $plugin.Location
        & $log "Plugin installer: $($plugin.Path)"
        if ($info -and $info.PluginsVersion -and (ConvertTo-IubReleaseVersion $info.PluginsVersion) -ne $plugin.Version) {
            $items.Add((New-IubItem Info "Plugin installer $($plugin.Version); the order's software says Plugins $(ConvertTo-IubReleaseVersion $info.PluginsVersion)" 'For information (U16).'))
        }
        & $step 'plugin' 'ok' ("{0}{1} ({2})" -f $plugin.Version, $(if ($plugin.IsLatest) { ' latest' } else { '' }), $plugin.Location)
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }

        # 6. Assemble -------------------------------------------------------------------------
        & $begin 'stage'
        $usbDir = Join-Path $staging 'usb'
        & $log 'Unpacking the plugin release zip...'
        [System.IO.Compression.ZipFile]::ExtractToDirectory($plugin.Path, $usbDir)
        foreach ($d in 'Application', 'Core') { [void][System.IO.Directory]::CreateDirectory((Join-Path $usbDir $d)) }
        $appBytes = 0
        foreach ($a in $export.ApplicationDirs) {
            # One zip per application folder, named after it ("Send to > Compressed folder").
            & $log "Zipping Application\$($a.Name).zip..."
            $appBytes += (New-IubZip -SourceDir $a.Dir -ZipPath (Join-Path $usbDir "Application\$($a.Name).zip")).Length
        }
        & $log 'Zipping Core\bin.zip...'
        $binZip = New-IubZip -SourceDir $export.BinDir -ZipPath (Join-Path $usbDir 'Core\bin.zip')
        $need = Get-IubTreeSize -Path $usbDir
        & $log ("USB content: {0:N1} MB (application {1:N1} MB, bin {2:N1} MB)" -f ($need / 1MB), ($appBytes / 1MB), ($binZip.Length / 1MB))
        & $step 'stage' 'ok' ("{0:N0} MB" -f ($need / 1MB))

        # Target checks belong before the line too: nothing is written if the stick is unusable.
        $letter = $TargetRoot.Substring(0, [Math]::Min(2, $TargetRoot.Length)).ToUpperInvariant()
        $noStickTest = $WhatIfPreference -and -not $TargetIsFolder -and
            @(Get-IubRemovableDrives | Where-Object { $_.Letter -eq $letter }).Count -eq 0
        if ($noStickTest) {
            $items.Add((New-IubItem Info "Test mode: no USB stick at $letter, so its size was not checked" ''))
        } elseif (-not $TargetIsFolder) {
            $drive = Assert-IubTargetDrive -Root $TargetRoot
            if ($need -gt ($drive.SizeBytes * 0.97)) {
                $tooSmall = "USB stick too small: needs {0:N0} MB, {1} holds {2:N0} MB" -f ($need / 1MB), $drive.Letter, ($drive.SizeBytes / 1MB)
                $items.Add((New-IubItem Failed $tooSmall ''))
                & $step 'stage' 'failed' 'stick too small'
                break
            }
        } elseif (-not (Test-Path -LiteralPath $TargetRoot) -and -not $WhatIfPreference) {
            New-Item -ItemType Directory -Path $TargetRoot -Force | Out-Null
        }
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }
        & $step 'line' 'ok' ''

        # ---- the write line ------------------------------------------------------------------
        $writeAllowed = if ($WhatIfPreference) { $false } else { $PSCmdlet.ShouldProcess($TargetRoot, 'Erase and write the upgrade USB') }
        if (-not $writeAllowed) {
            foreach ($id in 'erase', 'write', 'label', 'verify') { & $step $id 'skipped' 'test mode: not written' }
            $kept = if ($KeepStaging) { " The assembled content is in $usbDir" } else { '' }
            $items.Add((New-IubItem Info 'Test mode: the USB was not touched' "Everything above the line ran for real.$kept"))
            break
        }

        & $begin 'erase'
        & $log "Erasing $TargetRoot"
        Clear-IubTarget -Root $TargetRoot -Confirm:$false
        $result.Written = $true
        & $step 'erase' 'ok' ''

        & $begin 'write'
        Copy-IubTree -Source $usbDir -Destination $TargetRoot -OnFile { param($rel) & $log "copy $rel" } -Confirm:$false
        & $step 'write' 'ok' ("{0:N0} MB" -f ($need / 1MB))

        & $begin 'label'
        if ($TargetIsFolder) {
            & $step 'label' 'skipped' 'test folder, not a drive'
        } else {
            $lab = Set-IubVolumeLabel -Letter $TargetRoot -Label $OrderNumber -Confirm:$false
            if ($lab.Ok) {
                & $log "Label set to $OrderNumber ($($lab.Method))"
                & $step 'label' 'ok' $OrderNumber
            } else {
                & $log "Label not set: $($lab.Error)"
                $items.Add((New-IubItem Warning "Could not set the USB label to $OrderNumber" "This PC may need admin rights for it (plan U-c). Rename the stick by hand. Details: $($lab.Error)"))
                & $step 'label' 'warning' 'rename it by hand'
            }
        }

        & $begin 'verify'
        $diff = @(Compare-IubTree -Reference $usbDir -Target $TargetRoot)
        if ($diff.Count) {
            foreach ($d in $diff) { & $log "verify: $d" }
            $items.Add((New-IubItem Failed "USB verification failed: $($diff.Count) difference(s)" (($diff | Select-Object -First 5) -join '; ')))
            & $step 'verify' 'failed' "$($diff.Count) difference(s)"
            break
        }
        & $step 'verify' 'ok' 'identical to the staged content'
    } catch {
        $msg = $_.Exception.Message
        & $log "ERROR: $msg"
        $items.Add((New-IubItem Failed $msg ''))
        if ($current) { & $step $current 'failed' $msg }
    } finally {
        if (-not $result.Outcome) {
            $result.Outcome = if (@($items | Where-Object Severity -eq 'Failed').Count) { 'Failed' }
                              elseif (@($items | Where-Object Severity -eq 'Warning').Count) { 'Warning' }
                              else { 'Succeeded' }
        }
        if ($result.StagingDir -and -not $KeepStaging -and (Test-Path -LiteralPath $result.StagingDir)) {
            Remove-Item -LiteralPath $result.StagingDir -Recurse -Force -ErrorAction SilentlyContinue -WhatIf:$false
        }
        & $log "Outcome: $($result.Outcome)"
    } } while ($false)
    $result
}

# The delivery USB (Check only, Phase 1) lives in its own file.
. (Join-Path $PSScriptRoot 'InstallerUsbBuilder.Delivery.ps1')

function Remove-IubStaleStaging {
    # Staging folders are a few hundred MB; drop any left behind by a crashed or -KeepStaging run
    # more than a day ago.
    $root = (Get-IubConfig).StagingRoot
    if (-not (Test-Path -LiteralPath $root)) { return }
    foreach ($d in @(Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue)) {
        if ($d.LastWriteTime -lt (Get-Date).AddDays(-1)) {
            Remove-Item -LiteralPath $d.FullName -Recurse -Force -ErrorAction SilentlyContinue -WhatIf:$false
        }
    }
}
