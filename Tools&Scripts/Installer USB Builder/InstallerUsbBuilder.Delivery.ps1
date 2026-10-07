# Installer USB Builder - delivery USB: Check only (Phase 1)
#
# Dot-sourced by InstallerUsbBuilder.Engine.ps1. Works out what a delivery USB for an order would
# contain, where every file comes from, and what is missing - without writing anything except a
# report in %TEMP%. The rules live in installer-rules.json (plan principle 3); this file only
# applies them. Plan: "md documents\Assessments & Plans\Installer USB Builder - Plan.md".

# ---------------------------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------------------------

function Get-IubRules {
    param([string]$Path = (Join-Path $PSScriptRoot 'installer-rules.json'))
    if (-not (Test-Path -LiteralPath $Path)) { throw "Rules file not found: $Path" }
    return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Resolve-IubRef {
    # "template:02. Documents\x.pdf" -> root name, path inside the root, full path.
    param([Parameter(Mandatory)]$Rules, [Parameter(Mandatory)][string]$Ref)
    if ($Ref -notmatch '^(\w+):(.+)$') { throw "Rule file reference without a root: '$Ref'" }
    $rootName = $Matches[1]; $rel = $Matches[2]
    $root = $Rules.roots.$rootName
    if (-not $root) { throw "Unknown root '$rootName' in rule reference '$Ref'" }
    [pscustomobject]@{ Root = $rootName; Rel = $rel; Full = (Join-Path $root $rel) }
}

# ---------------------------------------------------------------------------------------------
# Template from SVN history (finding 11: ApplicationInfo.txt's template field is free text)
# ---------------------------------------------------------------------------------------------

function Get-IubOrderTemplate {
    # Follows the order folder's copy history back until it reaches /templates/Template <name>/.
    # Orders get renamed ("99339531 Norway ..." -> "99339531 NOR ..."), so a copy from /trunk is
    # followed further.
    param([Parameter(Mandatory)]$Order, [int]$MaxHops = 6)
    $repo = 'https://172.16.0.17/svn/SPD_Projects'
    $path = '/trunk/' + $Order.FolderName
    $rev = 'HEAD'
    $chain = New-Object System.Collections.Generic.List[string]
    for ($hop = 0; $hop -lt $MaxHops; $hop++) {
        $url = $repo + (($path.Split('/') | Where-Object { $_ } | ForEach-Object { '/' + [Uri]::EscapeDataString($_) }) -join '') + "@$rev"
        [xml]$x = Invoke-IubSvn -Arguments @('log', '--xml', '-v', '--stop-on-copy', '-r', "1:$rev", '-l', '1', $url)
        $hit = $null
        foreach ($p in @($x.log.logentry.paths.path)) {
            $copied = $p.InnerText
            if ($p.'copyfrom-path' -and ($path -eq $copied -or $path.StartsWith($copied + '/'))) { $hit = $p; break }
        }
        if (-not $hit) {
            return [pscustomobject]@{ Template = $null; TemplatePath = $null; Chain = $chain.ToArray(); Reason = "'$path' was created without a copy, so its template is unknown" }
        }
        $from = $hit.'copyfrom-path' + $path.Substring($hit.InnerText.Length)
        $chain.Add("$path <- $from@$($hit.'copyfrom-rev')")
        if ($from -match '^/templates/Template ([^/]+)') {
            return [pscustomobject]@{ Template = $Matches[1]; TemplatePath = $from; Chain = $chain.ToArray(); Reason = '' }
        }
        $path = $from
        $rev = $hit.'copyfrom-rev'
    }
    [pscustomobject]@{ Template = $null; TemplatePath = $null; Chain = $chain.ToArray(); Reason = "no template within $MaxHops copies" }
}

# ---------------------------------------------------------------------------------------------
# Hardware tables (read the way Extract-SystemProfile.ps1 reads them)
# ---------------------------------------------------------------------------------------------

function Read-IubTable {
    # Rows of one table from the largest SkalarPacks\*.xml that holds it, plus its enable column
    # taken from the inline schema (a DataSet omits null cells, so rows alone cannot tell).
    param([Parameter(Mandatory)][hashtable]$Texts, [Parameter(Mandatory)][string]$Tag)
    foreach ($name in @($Texts.Keys | Sort-Object { $Texts[$_].Length } -Descending)) {
        $text = $Texts[$name]
        if ($text.IndexOf("<$Tag>", [StringComparison]::Ordinal) -lt 0) { continue }
        $rows = New-Object System.Collections.Generic.List[object]
        foreach ($m in [regex]::Matches($text, "(?s)<$Tag>.*?</$Tag>")) {
            try { $node = ([xml]$m.Value).$Tag } catch { continue }
            $row = @{}
            foreach ($c in $node.ChildNodes) { if ($c.NodeType -eq 'Element') { $row[$c.Name] = $c.InnerText } }
            $rows.Add($row)
        }
        if ($rows.Count -eq 0) { continue }
        $columns = $null
        $s = [regex]::Match($text, "(?s)<xs:element name=""$Tag""[^>]*>(.*?)</xs:sequence>")
        if ($s.Success) { $columns = @([regex]::Matches($s.Groups[1].Value, '<xs:element name="(\w+)"') | ForEach-Object { $_.Groups[1].Value }) }
        $pool = if ($null -ne $columns) { $columns } else { @($rows | ForEach-Object { $_.Keys }) }
        $flag = $null
        foreach ($f in 'Available', 'Enabled', 'InUse', 'IsAvailable') { if ($pool -contains $f) { $flag = $f; break } }
        return [pscustomobject]@{ File = $name; Flag = $flag; Rows = $rows.ToArray() }
    }
    return $null
}

function Read-IubHardware {
    # Enabled rows of the tables the rules need, over every chosen application folder.
    # A table without an enable column (older orders) counts all its rows, with a note.
    param([Parameter(Mandatory)][string[]]$ApplicationDirs)
    $out = @{ Devices = @(); Diluters = @(); Probes = @(); PbfAvailable = $false; Notes = @() }
    $seenDevice = @{}
    foreach ($dir in $ApplicationDirs) {
        $packs = Join-Path $dir 'SkalarPacks'
        if (-not (Test-Path -LiteralPath $packs)) { $out.Notes += "No SkalarPacks folder in $(Split-Path -Leaf $dir)"; continue }
        $texts = @{}
        foreach ($f in @(Get-ChildItem -LiteralPath $packs -File | Where-Object { $_.Extension -match '^\.xml$' })) {
            $texts[$f.Name] = [System.IO.File]::ReadAllText($f.FullName)
        }
        foreach ($tag in 'DeviceConfiguration', 'DiluterConfiguration', 'Probes', 'PaperbandFilterConfiguration') {
            $t = Read-IubTable -Texts $texts -Tag $tag
            if (-not $t) { continue }
            $on = if ($t.Flag) { @($t.Rows | Where-Object { $_[$t.Flag] -eq 'true' }) } else { @($t.Rows) }
            if (-not $t.Flag) { $out.Notes += "$tag in $(Split-Path -Leaf $dir) has no enable flag: all $($t.Rows.Count) rows counted as fitted" }
            switch ($tag) {
                'DeviceConfiguration' {
                    foreach ($r in $on) {
                        $key = "$($r['DeviceID'])|$($r['SerialNumber'])"
                        if (-not $seenDevice.ContainsKey($key)) {
                            $seenDevice[$key] = $true
                            # Type 0 is the robot itself, in every layout seen (its DeviceID is "SP2000-3", or empty on older software).
                            $out.Devices += [pscustomobject]@{ DeviceID = [string]$r['DeviceID']; SerialNumber = [string]$r['SerialNumber']; Name = [string]$r['Name']; Type = [string]$r['Type']; IsRobot = ([string]$r['Type'] -eq '0' -or [string]$r['DeviceID'] -match '^SP\d') }
                        }
                    }
                }
                'DiluterConfiguration' { foreach ($r in $on) { $out.Diluters += [pscustomobject]@{ Name = [string]$r['DisplayName']; Type = [string]$r['DiluterType'] } } }
                'Probes' { foreach ($r in $on) { $out.Probes += [pscustomobject]@{ Name = [string]$r['Name']; SerialNumber = [string]$r['SerialNumber']; DeviceID = [string]$r['DeviceID'] } } }
                'PaperbandFilterConfiguration' { if ($t.Flag -and $on.Count -gt 0) { $out.PbfAvailable = $true } }
            }
        }
    }
    [pscustomobject]$out
}

# ---------------------------------------------------------------------------------------------
# Certificates
# ---------------------------------------------------------------------------------------------

function Find-IubOrderFolder {
    param([Parameter(Mandatory)]$Rules, [Parameter(Mandatory)][string]$OrderNumber)
    $root = $Rules.roots.orders
    $dirs = @([System.IO.Directory]::GetDirectories($root, "$OrderNumber*"))
    if ($dirs.Count -eq 1) { return $dirs[0] }
    return $null
}

function Get-IubSignedCertificates {
    # Signed test certificates (finding 6): "Robotic Certificate 3-<order>-NN[,] <parameter>[ Probe <serial>].pdf"
    # in "Undersigned docs\certificates undersigned\". Everything else there is reported, not used.
    param([Parameter(Mandatory)][string]$OrderFolder, [Parameter(Mandatory)][string]$OrderNumber)
    $dir = Join-Path $OrderFolder 'Undersigned docs\certificates undersigned'
    $found = New-Object System.Collections.Generic.List[object]
    $other = New-Object System.Collections.Generic.List[string]
    if ([System.IO.Directory]::Exists($dir)) {
        $pattern = "^Robotic Certificate 3-$OrderNumber-(\d+)[, ]+(.+?)(?:[, ]+Probe\s+(\S+))?\.pdf$"
        foreach ($f in [System.IO.Directory]::GetFiles($dir)) {
            $name = [System.IO.Path]::GetFileName($f)
            if ($name -match $pattern) {
                $fi = New-Object System.IO.FileInfo $f
                $found.Add([pscustomobject]@{ File = $f; Name = $name; Number = $Matches[1]; Parameter = $Matches[2].Trim([char[]]@(' ', ',')); ProbeSerial = $Matches[3]; Bytes = $fi.Length; Date = $fi.LastWriteTime })
            } elseif ($name -ne 'Thumbs.db') {
                $other.Add($name)
            }
        }
    }
    [pscustomobject]@{ Folder = $dir; Exists = [System.IO.Directory]::Exists($dir); Certificates = $found.ToArray(); Other = $other.ToArray() }
}

# ---------------------------------------------------------------------------------------------
# Manifest: what the delivery USB would contain
# ---------------------------------------------------------------------------------------------

function New-IubDeliveryManifest {
    # Applies the rules. Returns Entries (UsbPath, Source, Rule, Bytes, Status use|toCheck) and Items.
    param(
        [Parameter(Mandatory)]$Rules, [Parameter(Mandatory)]$Order, [Parameter(Mandatory)][string[]]$ApplicationFolders,
        $Template, [Parameter(Mandatory)]$Hardware, $Plugin, [string]$Serial, $Signed, [string]$OrderFolder
    )
    $entries = New-Object System.Collections.Generic.List[object]
    $items = New-Object System.Collections.Generic.List[object]
    $byPath = @{}
    $usb = $Rules.usbFolders
    $add = {
        param([string]$UsbPath, [string]$Source, [string]$Rule, [string]$Status, $Bytes)
        $k = $UsbPath.ToLowerInvariant()
        if ($byPath.ContainsKey($k)) {
            if ($Status -eq 'use' -and $byPath[$k].Status -ne 'use') { $byPath[$k].Status = 'use'; $byPath[$k].Rule = $Rule }
            return
        }
        $e = [pscustomobject]@{ UsbPath = $UsbPath; Source = $Source; Rule = $Rule; Status = $Status; Bytes = $Bytes }
        $byPath[$k] = $e
        $entries.Add($e)
    }
    $addRef = {
        # A template/methods/external file; checks it exists on the share.
        param([string]$Ref, [string]$UsbPath, [string]$Rule, [string]$Status)
        $r = Resolve-IubRef -Rules $Rules -Ref $Ref
        if (-not $UsbPath) { $UsbPath = $r.Rel }
        if (-not [System.IO.File]::Exists($r.Full)) {
            if ($Status -eq 'use') { $items.Add((New-IubItem Failed "A rule names a file that is not on the share: $($r.Rel)" "Rule: $Rule. Looked for $($r.Full). Update installer-rules.json.")) }
            else { $items.Add((New-IubItem Warning "To check, but the proposed file is not on the share: $($r.Rel)" "Rule: $Rule")) }
            return
        }
        & $add $UsbPath $r.Full $Rule $Status ((New-Object System.IO.FileInfo $r.Full).Length)
    }

    # 01. Skalar Robotics Access ---------------------------------------------------------------
    if ($Plugin) {
        $size = $null
        try {
            $z = [System.IO.Compression.ZipFile]::OpenRead($Plugin.Path)
            try { $size = (@($z.Entries | Where-Object { $_.Name -eq 'SkalarPackageInstaller.exe' }) | Select-Object -First 1).Length } finally { $z.Dispose() }
        } catch { }
        & $add "$($usb.access)\SkalarPackageInstaller.exe" $Plugin.Path "plugin $($Plugin.Version) (D1: the order's own Plugins version)" 'use' $size
    }
    foreach ($a in $ApplicationFolders) {
        & $add "$($usb.access)\Application\$a.zip" "SVN r$($Order.Revision): $($Order.FolderName)/$a" 'fresh svn export, zipped (D3)' 'use' $null
    }
    & $add "$($usb.access)\Core\bin.zip" "SVN r$($Order.Revision): $($Order.FolderName)/bin" 'fresh svn export, zipped' 'use' $null

    # Always ---------------------------------------------------------------------------------
    foreach ($rule in @($Rules.always)) {
        $label = "always ($($rule.basis))"
        if ($rule.folder) {
            $r = Resolve-IubRef -Rules $Rules -Ref $rule.folder
            if (-not [System.IO.Directory]::Exists($r.Full)) { $items.Add((New-IubItem Failed "A rule names a folder that is not on the share: $($r.Rel)" $r.Full)); continue }
            foreach ($f in [System.IO.Directory]::GetFiles($r.Full, '*', [System.IO.SearchOption]::AllDirectories)) {
                if ([System.IO.Path]::GetFileName($f) -eq 'Thumbs.db') { continue }
                $rel = Join-Path $r.Rel $f.Substring($r.Full.TrimEnd('\').Length + 1)
                & $add $rel $f $label $rule.status ((New-Object System.IO.FileInfo $f).Length)
            }
        } else {
            & $addRef $rule.file $null $label $rule.status
        }
    }

    # Template -> master manual --------------------------------------------------------------
    if (-not $Template -or -not $Template.Template) {
        $why = if ($Template) { $Template.Reason } else { 'not determined' }
        $items.Add((New-IubItem Failed 'The order''s template is unknown, so no master manual can be chosen' $why))
    } else {
        $hits = @($Rules.templates | Where-Object { $Template.Template -match $_.match })
        if ($hits.Count -eq 0) {
            $items.Add((New-IubItem Failed "No master-manual rule for template '$($Template.Template)'" 'Add a row to "templates" in installer-rules.json (U7).'))
        }
        foreach ($h in $hits) { foreach ($f in @($h.files)) { & $addRef $f $null "template $($Template.Template) ($($h.basis))" $h.status } }
    }

    # Devices ----------------------------------------------------------------------------------
    $serialDir = if ($Serial) { Join-Path $Rules.roots.serial $Serial } else { $null }
    $serialFiles = @()
    if ($serialDir -and [System.IO.Directory]::Exists($serialDir)) {
        $serialFiles = @([System.IO.Directory]::GetFiles($serialDir) | Where-Object { [System.IO.Path]::GetFileName($_) -ne 'Thumbs.db' })
    } elseif ($serialDir) {
        $items.Add((New-IubItem Warning "No serial-number folder for robot $Serial" "Looked for $serialDir. Calibration certificates can't be collected."))
    } else {
        $items.Add((New-IubItem Warning 'The robot serial is unknown, so the serial-number folder (calibration certificates) is not checked' ''))
    }
    $usedSerial = @{}
    foreach ($d in @($Hardware.Devices)) {
        if ($d.IsRobot) { continue }
        if (-not $d.DeviceID -or $d.DeviceID -eq $d.SerialNumber) {
            # Older software (99339531) keeps the serial in DeviceID; only the Type number names the meter.
            $items.Add((New-IubItem Warning "Device of type $($d.Type) (serial $($d.SerialNumber)) has no model name in DeviceID" 'Older software layout: no rule can be chosen for it. Pick its manual and certificate by hand.'))
            continue
        }
        # (Not "$rules": PowerShell names ignore case, and that would overwrite $Rules.)
        $devRules = @($Rules.devices | Where-Object { $d.DeviceID -match $_.match })
        if (@($devRules | Where-Object { $_.robot }).Count) { continue }
        if ($devRules.Count -eq 0) {
            $items.Add((New-IubItem Failed "No rule for device '$($d.DeviceID)'" 'A meter type nobody added yet: add a row to "devices" in installer-rules.json (U7).'))
            continue
        }
        $certNeed = 'none'
        foreach ($r in $devRules) {
            foreach ($f in @($r.files)) { & $addRef $f $null "device $($d.DeviceID) ($($r.basis))" $r.status }
            if ($r.certificate -eq 'required') { $certNeed = 'required' } elseif ($r.certificate -eq 'toCheck' -and $certNeed -ne 'required') { $certNeed = 'toCheck' }
        }
        if ($certNeed -eq 'none' -or -not $serialFiles) { continue }
        if (-not $d.SerialNumber) {
            $items.Add((New-IubItem Warning "Device '$($d.DeviceID)' has no SerialNumber in DeviceConfiguration" 'Its calibration certificate cannot be found or checked.'))
            continue
        }
        $cert = @($serialFiles | Where-Object { [System.IO.Path]::GetFileName($_) -like "*$($d.SerialNumber)*" })
        if ($cert.Count) {
            foreach ($c in $cert) {
                $usedSerial[$c] = $true
                & $add "$($usb.calibration)\$([System.IO.Path]::GetFileName($c))" $c "calibration certificate of $($d.DeviceID) serial $($d.SerialNumber)" 'use' ((New-Object System.IO.FileInfo $c).Length)
            }
        } elseif ($certNeed -eq 'required') {
            $items.Add((New-IubItem Failed "No calibration certificate for $($d.DeviceID) serial $($d.SerialNumber)" "Nothing with that serial in $serialDir (U7)."))
        } else {
            $items.Add((New-IubItem Warning "No calibration certificate for $($d.DeviceID) serial $($d.SerialNumber)" 'Is one expected for this meter type? (L8)'))
        }
    }

    # Diluters ---------------------------------------------------------------------------------
    foreach ($dl in @($Hardware.Diluters)) {
        foreach ($rule in @($Rules.diluters | Where-Object { $dl.Type -match $_.type })) {
            $hit = @($serialFiles | Where-Object { [System.IO.Path]::GetFileName($_) -like $rule.serialFile })
            if ($hit.Count) {
                foreach ($c in $hit) { $usedSerial[$c] = $true; & $add "$($usb.calibration)\$([System.IO.Path]::GetFileName($c))" $c "diluter certificate ($($dl.Type), $($rule.basis))" 'use' ((New-Object System.IO.FileInfo $c).Length) }
            } elseif ($serialFiles) {
                $items.Add((New-IubItem Warning "No $($dl.Type) diluter certificate ($($rule.serialFile)) in the serial-number folder" "Enabled diluter: $($dl.Name)"))
            }
        }
    }
    $left = @($serialFiles | Where-Object { -not $usedSerial.ContainsKey($_) } | ForEach-Object { [System.IO.Path]::GetFileName($_) })
    foreach ($l in $left) { & $add "$($usb.calibration)\$l" (Join-Path $serialDir $l) 'serial-number folder, matches no device (L2/L8)' 'toCheck' $null }

    # Paperband filter -------------------------------------------------------------------------
    if ($Hardware.PbfAvailable) { foreach ($f in @($Rules.paperbandFilter.files)) { & $addRef $f $null "paperband filter ($($Rules.paperbandFilter.basis))" $Rules.paperbandFilter.status } }

    # Signed certificates and methods ----------------------------------------------------------
    if (-not $OrderFolder) {
        $items.Add((New-IubItem Warning 'No signed certificates found: the order folder was not found on the share' "Looked for $($Rules.roots.orders)\$($Order.OrderNumber)* (D5)."))
    } elseif (-not $Signed -or $Signed.Certificates.Count -eq 0) {
        $items.Add((New-IubItem Warning 'No signed certificates found (0)' "Looked in $(if ($Signed) { $Signed.Folder } else { $OrderFolder }) (D5). The USB would ship without test certificates."))
    } else {
        $probeSerials = @($Hardware.Probes | Where-Object { $_.SerialNumber } | ForEach-Object { $_.SerialNumber })
        foreach ($c in $Signed.Certificates) {
            & $add "$($usb.certificates)\$($c.Name)" $c.File ("signed certificate, {0:yyyy-MM-dd}" -f $c.Date) 'use' $c.Bytes
            if ($c.ProbeSerial -and $probeSerials.Count -and $probeSerials -notcontains $c.ProbeSerial) {
                $items.Add((New-IubItem Warning "Certificate $($c.Number) names probe $($c.ProbeSerial), which is not a probe serial in the Probes table" "Probes table: $($probeSerials -join ', '). One of the two is wrong (finding 19)."))
            }
            $m = @($Rules.methods | Where-Object { $c.Parameter -match $_.match }) | Select-Object -First 1
            if (-not $m) {
                $items.Add((New-IubItem Warning "No method rule for certificate parameter '$($c.Parameter)'" 'No method PDF chosen for it. Add a row to "methods" in installer-rules.json.'))
                continue
            }
            foreach ($f in @($m.files)) {
                $ref = if ($f -is [string]) { $f } else { $f.from }
                $name = if ($f -is [string]) { [System.IO.Path]::GetFileName((Resolve-IubRef -Rules $Rules -Ref $ref).Rel) } else { $f.as }
                & $addRef $ref "$($usb.methods)\$name" "method for '$($c.Parameter)' ($($m.basis))" $m.status
            }
        }
        foreach ($o in $Signed.Other) { $items.Add((New-IubItem Info "Not used from the signed-certificates folder: $o" 'Only "Robotic Certificate 3-<order>-*.pdf" is copied.')) }
    }

    # To-check entries become warnings (U8): left off the USB, listed for a human.
    foreach ($e in @($entries | Where-Object { $_.Status -eq 'toCheck' })) {
        $items.Add((New-IubItem Warning "To check (not on the USB): $($e.UsbPath)" $e.Rule))
    }
    [pscustomobject]@{ Entries = $entries.ToArray(); Items = $items.ToArray() }
}

# ---------------------------------------------------------------------------------------------
# Check only (Phase 1, U10)
# ---------------------------------------------------------------------------------------------

function Get-IubCheckSteps {
    @(
        [pscustomobject]@{ Id = 'network';  Caption = 'Network: SVN, build server, shares' }
        [pscustomobject]@{ Id = 'order';    Caption = 'Order in SVN' }
        [pscustomobject]@{ Id = 'template'; Caption = 'Template (SVN history)' }
        [pscustomobject]@{ Id = 'software'; Caption = 'Software export' }
        [pscustomobject]@{ Id = 'core';     Caption = 'Core (bin)' }
        [pscustomobject]@{ Id = 'plugin';   Caption = 'Plugin installer (order''s own version)' }
        [pscustomobject]@{ Id = 'hardware'; Caption = 'Hardware tables' }
        [pscustomobject]@{ Id = 'contents'; Caption = 'Documents, certificates, methods' }
        [pscustomobject]@{ Id = 'report';   Caption = 'Report' }
    )
}

function Invoke-IubCheckOnly {
    <#
    .SYNOPSIS
    Check only: what the delivery USB for an order would contain, from where, and what is missing.
    Writes nothing except an HTML report under %TEMP%\InstallerUsbBuilder\Reports.
    Same callbacks and result shape as Invoke-IubUpgradeUsb, plus Manifest and ReportPath.
    #>
    param(
        [Parameter(Mandatory)][ValidatePattern('^\d{8}$')][string]$OrderNumber,
        [string[]]$ApplicationFolders,
        [string]$RulesPath,
        [switch]$KeepStaging,
        [switch]$NoReport,
        [scriptblock]$OnStep,
        [scriptblock]$OnLog,
        [hashtable]$CancelToken
    )
    $cfg = Get-IubConfig
    $items = New-Object System.Collections.Generic.List[object]
    $result = [pscustomobject]@{
        Kind = 'Check'; Outcome = $null; Items = $items; Order = $null; Revision = $null; ApplicationFolders = @()
        Template = $null; Serial = $null; CoreVersion = $null; PluginVersion = $null; Hardware = $null; Manifest = @()
        ReportPath = $null; StagingDir = $null; Written = $false; TestMode = $false; TargetRoot = $null; Label = $null
    }
    $current = $null
    $step = { param($id, $status, $detail) if ($OnStep) { & $OnStep $id $status $detail } }
    $log = { param($text) if ($OnLog) { & $OnLog $text } }
    $begin = { param($id) Set-Variable -Name current -Value $id -Scope 1 -WhatIf:$false; & $step $id 'running' '' }
    $cancelled = { $CancelToken -and $CancelToken['Cancel'] }
    Remove-IubStaleStaging

    do { try {
        $rules = if ($RulesPath) { Get-IubRules -Path $RulesPath } else { Get-IubRules }

        & $begin 'network'
        $net = @(Test-IubNetwork -IncludeOrdersShare)
        foreach ($n in $net) { & $log ("{0,-20} {1}  {2}" -f $n.Name, $(if ($n.Ok) { 'ok' } else { 'NOT REACHABLE' }), $n.Detail) }
        $missing = @($net | Where-Object { -not $_.Ok -and $_.Required })
        foreach ($n in $missing) { $items.Add((New-IubItem Failed "$($n.Name) not reachable" $n.Detail)) }
        if ($missing.Count) { & $step 'network' 'failed' (($missing | ForEach-Object Name) -join ', '); break }
        & $step 'network' 'ok' ''
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }

        & $begin 'order'
        $order = Resolve-IubOrder -OrderNumber $OrderNumber
        $result.Order = $order; $result.Revision = $order.Revision
        $chosen = if ($ApplicationFolders) { @($ApplicationFolders) } else { @($order.ApplicationFolders) }
        $result.ApplicationFolders = $chosen
        & $log "SVN folder: $($order.FolderName); application folder(s): $($chosen -join '; ')"
        & $step 'order' 'ok' ("r{0}  {1:yyyy-MM-dd}  {2}" -f $order.Revision, $order.Date, $order.Author)
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }

        & $begin 'template'
        $tpl = Get-IubOrderTemplate -Order $order
        $result.Template = $tpl
        foreach ($c in $tpl.Chain) { & $log "copy: $c" }
        if ($tpl.Template) { & $step 'template' 'ok' $tpl.Template } else { & $step 'template' 'failed' 'unknown'; & $log $tpl.Reason }
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }

        & $begin 'software'
        $staging = Join-Path $cfg.StagingRoot ("{0}-check-{1:yyyyMMdd-HHmmss}" -f $OrderNumber, (Get-Date))
        $result.StagingDir = $staging
        $export = Export-IubSoftware -Order $order -Destination (Join-Path $staging 'src') -ApplicationFolders $chosen
        $infoPath = Join-Path $export.ApplicationDirs[0].Dir 'binAndPluginsInfo.txt'
        $info = if (Test-Path -LiteralPath $infoPath) { ConvertFrom-IubVersionInfo -Text (Get-Content -LiteralPath $infoPath -Raw) } else { $null }
        $serial = $order.Serial
        & $step 'software' 'ok' "r$($order.Revision)"
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }

        & $begin 'core'
        $exe = Join-Path $export.BinDir "Release\$($cfg.CoreExe)"
        $exeVersion = if (Test-Path -LiteralPath $exe) { (Get-Item -LiteralPath $exe).VersionInfo.FileVersion } else { $null }
        $result.CoreVersion = $exeVersion
        if (-not $exeVersion) {
            $items.Add((New-IubItem Failed "bin has no Release\$($cfg.CoreExe)" "SVN r$($order.Revision)"))
            & $step 'core' 'failed' 'no core'
        } elseif ($coreRelease = Find-IubRelease -Kind Core -Version $exeVersion) {
            & $step 'core' 'ok' "$(ConvertTo-IubReleaseVersion $exeVersion), release ($($coreRelease.Location))"
        } else {
            # U7: on a delivery USB a non-release core is critical.
            $items.Add((New-IubItem Failed "bin $exeVersion is not a released core" 'Not in the release folder, its Archive or the historical archive (beta check, U7).'))
            & $step 'core' 'failed' "$exeVersion, not a release"
        }
        if ($info -and $info.BinVersion -and $exeVersion -and $info.BinVersion -ne $exeVersion) {
            $items.Add((New-IubItem Warning "binAndPluginsInfo.txt says Bin $($info.BinVersion), but $($cfg.CoreExe) is $exeVersion" ''))
        }
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }

        & $begin 'plugin'
        $plugin = $null
        if (-not $info -or -not $info.PluginsVersion) {
            $items.Add((New-IubItem Failed 'The software states no Plugins version (binAndPluginsInfo.txt)' 'D1: a delivery USB carries the plugin version the system was tested with, and it is not recorded.'))
            & $step 'plugin' 'failed' 'version unknown'
        } else {
            $plugin = Find-IubRelease -Kind Plugin -Version $info.PluginsVersion
            if ($plugin) {
                $result.PluginVersion = $plugin.Version
                $latest = @(Get-IubReleases -Kind Plugin)[0]
                if ($latest -and $latest.Version -ne $plugin.Version) { $items.Add((New-IubItem Info "Plugin $($latest.Version) is released; this system was tested on $($plugin.Version)" 'The USB carries the tested version (D1).')) }
                & $step 'plugin' 'ok' "$($plugin.Version) ($($plugin.Location))"
            } else {
                $items.Add((New-IubItem Failed "Plugin release $(ConvertTo-IubReleaseVersion $info.PluginsVersion) not found" 'Not in the release folder, its Archive or the historical archive.'))
                & $step 'plugin' 'failed' 'not found'
            }
        }
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }

        & $begin 'hardware'
        $hw = Read-IubHardware -ApplicationDirs @($export.ApplicationDirs | ForEach-Object Dir)
        $result.Hardware = $hw
        foreach ($n in $hw.Notes) { & $log $n }
        if (@($hw.Notes | Where-Object { $_ -like 'DeviceConfiguration * has no enable flag*' }).Count) {
            # Older software (e.g. 99339531): no enable column, and DeviceID may hold other values.
            $items.Add((New-IubItem Warning 'Older software layout: DeviceConfiguration has no enable flag' 'Its rows say what is configured, not what is fitted, and the device findings below may not apply. Check only is meant for new deliveries.'))
        }
        foreach ($d in $hw.Devices) { & $log "device: $($d.DeviceID)  serial $($d.SerialNumber)" }
        foreach ($d in $hw.Diluters) { & $log "diluter: $($d.Name) ($($d.Type))" }
        & $log "paperband filter available: $($hw.PbfAvailable)"
        if (-not $serial) {
            # Older folder names carry no serial; the robot's own DeviceConfiguration row does.
            $robot = @($hw.Devices | Where-Object { $_.IsRobot -and $_.SerialNumber }) | Select-Object -First 1
            if ($robot) { $serial = $robot.SerialNumber; & $log "serial $serial taken from the robot's DeviceConfiguration row" }
        } else {
            $robot = @($hw.Devices | Where-Object { $_.IsRobot -and $_.SerialNumber }) | Select-Object -First 1
            if ($robot -and $robot.SerialNumber -ne $serial) {
                $items.Add((New-IubItem Warning "The folder name says serial $serial, the robot's DeviceConfiguration row says $($robot.SerialNumber)" 'The folder name is used.'))
            }
        }
        $result.Serial = $serial
        $meters = @($hw.Devices | Where-Object { -not $_.IsRobot }).Count
        & $step 'hardware' 'ok' ("{0} device(s), {1} diluter(s){2}" -f $meters, @($hw.Diluters).Count, $(if ($hw.PbfAvailable) { ', paperband filter' } else { '' }))
        if (& $cancelled) { $result.Outcome = 'Cancelled'; break }

        & $begin 'contents'
        $orderFolder = Find-IubOrderFolder -Rules $rules -OrderNumber $OrderNumber
        $signed = if ($orderFolder) { Get-IubSignedCertificates -OrderFolder $orderFolder -OrderNumber $OrderNumber } else { $null }
        & $log "order folder: $(if ($orderFolder) { $orderFolder } else { 'not found' })"
        $manifest = New-IubDeliveryManifest -Rules $rules -Order $order -ApplicationFolders $chosen -Template $tpl -Hardware $hw `
            -Plugin $plugin -Serial $serial -Signed $signed -OrderFolder $orderFolder
        $result.Manifest = $manifest.Entries
        foreach ($i in $manifest.Items) { $items.Add($i) }
        $use = @($manifest.Entries | Where-Object Status -eq 'use')
        & $step 'contents' 'ok' ("{0} files on the USB, {1} to check" -f $use.Count, @($manifest.Entries | Where-Object Status -eq 'toCheck').Count)
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
    } } while ($false)

    if (-not $NoReport -and $result.Order) {
        & $step 'report' 'running' ''
        try {
            $result.ReportPath = New-IubCheckReport -Result $result
            & $step 'report' 'ok' (Split-Path -Leaf $result.ReportPath)
        } catch {
            $items.Add((New-IubItem Warning "The report could not be written: $($_.Exception.Message)" ''))
            & $step 'report' 'failed' ''
        }
    } else {
        & $step 'report' 'skipped' ''
    }
    & $log "Outcome: $($result.Outcome)"
    $result
}

# ---------------------------------------------------------------------------------------------
# Report (self-contained HTML, U12; Check only writes it to %TEMP%)
# ---------------------------------------------------------------------------------------------

function New-IubCheckReport {
    param([Parameter(Mandatory)]$Result, [string]$Folder = (Join-Path (Get-IubConfig).StagingRoot 'Reports'))
    [void][System.IO.Directory]::CreateDirectory($Folder)
    $h = { param($s) [System.Net.WebUtility]::HtmlEncode([string]$s) }
    $o = $Result.Order
    $color = switch ($Result.Outcome) { 'Succeeded' { '#1a7f37' } 'Warning' { '#b35900' } default { '#b42318' } }
    $title = switch ($Result.Outcome) { 'Succeeded' { 'CHECK OK - nothing missing' } 'Warning' { 'CHECK - with warnings' } 'Cancelled' { 'CHECK CANCELLED' } default { 'CHECK FAILED - this USB cannot be made yet' } }
    $sb = New-Object System.Text.StringBuilder
    $line = { param($t) [void]$sb.AppendLine($t) }
    & $line '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    & $line "<title>USB check $($o.OrderNumber)</title><style>"
    & $line 'body{font-family:Segoe UI,Arial,sans-serif;margin:24px;color:#1f2328;background:#fff;max-width:1100px}h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px;border-bottom:1px solid #d0d7de;padding-bottom:4px}'
    & $line 'table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:4px 8px;border-bottom:1px solid #eaeef2;vertical-align:top}th{background:#f6f8fa}'
    & $line '.Failed{color:#b42318}.Warning{color:#b35900}.Info{color:#57606a}.muted{color:#57606a}.toCheck td{color:#b35900}code{font-family:Consolas,monospace;font-size:12px}'
    & $line '</style></head><body>'
    & $line "<h1 style=""color:$color"">$(& $h $title)</h1>"
    & $line ("<div class=""muted"">Order {0} &middot; generated {1:yyyy-MM-dd HH:mm} by the Installer USB Builder (Check only: nothing was written)</div>" -f (& $h $o.OrderNumber), (Get-Date))
    & $line '<h2>Order</h2><table>'
    $facts = [ordered]@{
        'SVN folder' = $o.FolderName
        'Application folder(s)' = ($Result.ApplicationFolders -join '; ')
        'Serial' = $(if ($Result.Serial) { $Result.Serial } else { 'unknown' })
        'Last commit' = ("r{0}, {1:yyyy-MM-dd HH:mm}, {2}: {3}" -f $o.Revision, $o.Date, $o.Author, $o.Message)
        'Template' = $(if ($Result.Template -and $Result.Template.Template) { "$($Result.Template.Template) ($($Result.Template.TemplatePath))" } else { 'unknown' })
        'Core' = $Result.CoreVersion
        'Plugin installer' = $Result.PluginVersion
    }
    if ($Result.Hardware) {
        $facts['Devices'] = (@($Result.Hardware.Devices | ForEach-Object { "$($_.DeviceID) ($($_.SerialNumber))" }) -join '; ')
        $facts['Diluters'] = (@($Result.Hardware.Diluters | ForEach-Object { "$($_.Name) ($($_.Type))" }) -join '; ')
        $facts['Paperband filter'] = $Result.Hardware.PbfAvailable
    }
    foreach ($k in $facts.Keys) { & $line "<tr><th style=""width:180px"">$(& $h $k)</th><td>$(& $h $facts[$k])</td></tr>" }
    & $line '</table>'
    & $line '<h2>Findings</h2>'
    if ($Result.Items.Count -eq 0) { & $line '<p>None.</p>' } else {
        & $line '<table><tr><th style="width:80px">Severity</th><th>Finding</th><th>Detail</th></tr>'
        foreach ($sev in 'Failed', 'Warning', 'Info') {
            foreach ($i in @($Result.Items | Where-Object Severity -eq $sev)) { & $line "<tr class=""$sev""><td>$sev</td><td>$(& $h $i.Text)</td><td class=""muted"">$(& $h $i.Detail)</td></tr>" }
        }
        & $line '</table>'
    }
    $use = @($Result.Manifest | Where-Object Status -eq 'use' | Sort-Object UsbPath)
    $chk = @($Result.Manifest | Where-Object Status -eq 'toCheck' | Sort-Object UsbPath)
    $total = ($use | Where-Object { $_.Bytes } | Measure-Object -Property Bytes -Sum).Sum
    & $line ("<h2>USB contents ({0} files, {1:N0} MB plus the application and bin zips)</h2>" -f $use.Count, ($total / 1MB))
    & $line '<table><tr><th>On the USB</th><th>From</th><th>Rule</th><th style="width:70px">Size</th></tr>'
    foreach ($e in $use) { & $line ("<tr><td><code>{0}</code></td><td class=""muted""><code>{1}</code></td><td>{2}</td><td>{3}</td></tr>" -f (& $h $e.UsbPath), (& $h $e.Source), (& $h $e.Rule), $(if ($e.Bytes) { '{0:N1} MB' -f ($e.Bytes / 1MB) } else { '' })) }
    & $line '</table>'
    if ($chk.Count) {
        & $line "<h2>To check ($($chk.Count)): proposed, not on the USB</h2>"
        & $line '<table><tr><th>Would go to</th><th>From</th><th>Why it needs a human</th></tr>'
        foreach ($e in $chk) { & $line ("<tr class=""toCheck""><td><code>{0}</code></td><td><code>{1}</code></td><td>{2}</td></tr>" -f (& $h $e.UsbPath), (& $h $e.Source), (& $h $e.Rule)) }
        & $line '</table>'
    }
    & $line '</body></html>'
    $path = Join-Path $Folder ("{0} USB check {1:yyyy-MM-dd HHmmss}.html" -f $o.OrderNumber, (Get-Date))
    [System.IO.File]::WriteAllText($path, $sb.ToString(), (New-Object System.Text.UTF8Encoding $false))
    return $path
}

# ---------------------------------------------------------------------------------------------
# Phase 1 validation: manifest vs a hand-made USB (an order folder's Installer Backup\ zip)
# ---------------------------------------------------------------------------------------------

function Compare-IubManifestToBackup {
    # Compares the 'use' entries of a Check-only manifest with the file list of a backup zip.
    # A wrapper folder around the six standard folders is stripped. Returns Both / OnlyManifest / OnlyBackup.
    param([Parameter(Mandatory)][object[]]$Manifest, [Parameter(Mandatory)][string]$BackupZip)
    $z = [System.IO.Compression.ZipFile]::OpenRead($BackupZip)
    try { $names = @($z.Entries | Where-Object { $_.Name } | ForEach-Object { $_.FullName.Replace('/', '\') }) } finally { $z.Dispose() }
    if (-not @($names | Where-Object { $_ -match '^0\d\. ' }).Count) {
        $tops = @($names | ForEach-Object { ($_ -split '\\')[0] } | Sort-Object -Unique)
        if ($tops.Count -eq 1) { $names = @($names | ForEach-Object { $_.Substring($tops[0].Length + 1) }) }
    }
    $backup = @{}
    foreach ($n in $names) { if ([System.IO.Path]::GetFileName($n) -ne 'Thumbs.db') { $backup[$n.ToLowerInvariant()] = $n } }
    $mine = @{}
    foreach ($e in @($Manifest | Where-Object Status -eq 'use')) { $mine[$e.UsbPath.ToLowerInvariant()] = $e.UsbPath }
    [pscustomobject]@{
        Both         = @($mine.Keys | Where-Object { $backup.ContainsKey($_) } | ForEach-Object { $mine[$_] } | Sort-Object)
        OnlyManifest = @($mine.Keys | Where-Object { -not $backup.ContainsKey($_) } | ForEach-Object { $mine[$_] } | Sort-Object)
        OnlyBackup   = @($backup.Keys | Where-Object { -not $mine.ContainsKey($_) } | ForEach-Object { $backup[$_] } | Sort-Object)
    }
}
