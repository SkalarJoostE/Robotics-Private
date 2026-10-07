<#
.SYNOPSIS
Installer USB Builder - the window (and a headless mode for the same functions).

.DESCRIPTION
Normally started by "Installer USB Builder.bat". Design: "md documents\Assessments & Plans\
Installer USB Builder - Plan.md", section "How the Lab uses it" (U1-U17).

Phase 2b: only the Software upgrade USB side function is enabled. Check only (Phase 1),
Create installer, Prepare PC for shipping and Verify installation (Phase 3) are shown disabled.

-WhatIf opens the window in TEST MODE: everything above the "nothing written" line runs for
real, the USB stick is never touched.

Headless, no window:
  .\InstallerUsbBuilder.ps1 -UpgradeUsb -OrderNumber 99445669 -Target E: [-PluginVersion 1.79.3] [-WhatIf]
  .\InstallerUsbBuilder.ps1 -UpgradeUsb -OrderNumber 99445669 -Target C:\Temp\usb -TargetIsFolder
Exit code: 0 Succeeded, 2 Warning, 1 Failed or Cancelled.

-SmokeTest builds every form and runs the progress/result rendering on fake data, then exits.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$OrderNumber,
    [switch]$UpgradeUsb,
    [string]$Target,
    [string]$PluginVersion,
    [string[]]$ApplicationFolder,
    [switch]$TargetIsFolder,
    [switch]$KeepStaging,
    [switch]$SmokeTest
)

$ErrorActionPreference = 'Stop'
$enginePath = Join-Path $PSScriptRoot 'InstallerUsbBuilder.Engine.ps1'
. $enginePath

function ConvertTo-TargetRoot {
    param([string]$Value, [switch]$IsFolder)
    if ($IsFolder) { return $Value }
    if ($Value -match '^([A-Za-z]):?\\?$') { return "$($Matches[1].ToUpperInvariant()):\" }
    throw "Target '$Value' is not a drive letter (use E: or pass -TargetIsFolder)."
}

# =============================================================================================
# Headless mode
# =============================================================================================
if ($UpgradeUsb) {
    if (-not $OrderNumber -or -not $Target) { throw '-UpgradeUsb needs -OrderNumber and -Target.' }
    $root = ConvertTo-TargetRoot -Value $Target -IsFolder:$TargetIsFolder
    $captions = @{}
    foreach ($s in @(Get-IubUpgradeSteps)) { $captions[$s.Id] = $s.Caption }
    $r = Invoke-IubUpgradeUsb -OrderNumber $OrderNumber -TargetRoot $root -PluginVersion $PluginVersion `
        -ApplicationFolders $ApplicationFolder -TargetIsFolder:$TargetIsFolder -KeepStaging:$KeepStaging -WhatIf:$WhatIfPreference `
        -OnStep { param($id, $status, $detail) if ($status -ne 'running') { Write-Host ('{0,-8} {1,-32} {2}' -f $status, $captions[$id], $detail) } } `
        -OnLog { param($line) Write-Verbose $line }
    Write-Host ''
    Write-Host "Outcome: $($r.Outcome)"
    foreach ($i in $r.Items) {
        Write-Host ("  [{0}] {1}" -f $i.Severity, $i.Text)
        if ($i.Detail) { Write-Host "          $($i.Detail)" }
    }
    switch ($r.Outcome) { 'Succeeded' { exit 0 } 'Warning' { exit 2 } default { exit 1 } }
}

# =============================================================================================
# Window
# =============================================================================================
$testMode = [bool]$WhatIfPreference
# The preference only marks test mode; it must not leak into the UI thread's own cmdlets.
$WhatIfPreference = $false

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$font = New-Object System.Drawing.Font('Segoe UI', 9)
$fontBold = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
$fontTitle = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$fontOutcome = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
$colorRed = [System.Drawing.Color]::FromArgb(192, 0, 0)
$colorOrange = [System.Drawing.Color]::FromArgb(204, 102, 0)
$colorGreen = [System.Drawing.Color]::FromArgb(0, 128, 0)
$colorGray = [System.Drawing.Color]::Gray

# Shared state for the event handlers (a hashtable, so handlers never fight over scopes).
$ui = @{ Order = $null; SoftwareInfo = $null; Drives = @(); TestMode = $testMode; EnginePath = $enginePath }

function New-Control {
    param([string]$Type, [int]$X, [int]$Y, [int]$W, [int]$H, [string]$Text = '', $Font = $font)
    $c = New-Object "System.Windows.Forms.$Type"
    $c.Location = New-Object System.Drawing.Point($X, $Y)
    $c.Size = New-Object System.Drawing.Size($W, $H)
    $c.Text = $Text
    $c.Font = $Font
    return $c
}

function Get-StepGlyph {
    param([string]$Status, [int]$Tick = 0)
    switch ($Status) {
        'ok'      { return [string][char]0x2714 }
        'failed'  { return [string][char]0x2716 }
        'warning' { return '!' }
        'skipped' { return '-' }
        'running' { return @('|', '/', '-', '\')[$Tick % 4] }
        default   { return '' }
    }
}

# ---------------------------------------------------------------------------------------------
# Confirmation dialog for the Software upgrade USB (U14-U16)
# ---------------------------------------------------------------------------------------------
function New-UpgradeConfirmForm {
    param($Order, $SoftwareInfo, $Drive, [object[]]$Plugins, [bool]$TestMode)
    $f = New-Object System.Windows.Forms.Form
    $f.Text = "Software upgrade USB - $($Order.OrderNumber)"
    $f.Size = New-Object System.Drawing.Size(520, 330)
    $f.FormBorderStyle = 'FixedDialog'; $f.MaximizeBox = $false; $f.MinimizeBox = $false
    $f.StartPosition = 'CenterParent'; $f.Font = $font

    $f.Controls.Add((New-Control Label 16 16 470 20 'Software (SVN, newest commit of the order):' $fontBold))
    $f.Controls.Add((New-Control Label 30 38 450 20 ("r{0}   {1:yyyy-MM-dd HH:mm}   {2}" -f $Order.Revision, $Order.Date, $Order.Author)))
    $msg = New-Control Label 30 58 450 36 ('"' + $Order.Message + '"')
    $msg.ForeColor = $colorGray
    $f.Controls.Add($msg)

    # Application folders: one checkbox each, all ticked; every ticked one becomes its own zip.
    $apps = @($Order.ApplicationFolders)
    $caption = if ($apps.Count -gt 1) { "Application folders ($($apps.Count), sharing one bin):" } else { 'Application folder:' }
    $f.Controls.Add((New-Control Label 16 100 470 20 $caption $fontBold))
    $rowsShown = [Math]::Min([Math]::Max($apps.Count, 1), 5)
    $chk = New-Control CheckedListBox 30 122 450 ($rowsShown * 18 + 6)
    $chk.CheckOnClick = $true
    foreach ($a in $apps) { [void]$chk.Items.Add($a, $true) }
    $f.Controls.Add($chk)
    $dy = $chk.Bottom + 10 - 101

    $f.Controls.Add((New-Control Label 16 (104 + $dy) 120 20 'Plugin installer:' $fontBold))
    $cmb = New-Control ComboBox 140 (101 + $dy) 200 24
    $cmb.DropDownStyle = 'DropDownList'
    foreach ($p in $Plugins) {
        $tag = if ($p.IsLatest) { 'latest' } else { $p.Location }
        [void]$cmb.Items.Add(("{0}  ({1})" -f $p.Version, $tag))
    }
    if ($cmb.Items.Count) { $cmb.SelectedIndex = 0 }
    $f.Controls.Add($cmb)
    $own = if ($SoftwareInfo -and $SoftwareInfo.PluginsVersion) { "order's software says: Plugins $(ConvertTo-IubReleaseVersion $SoftwareInfo.PluginsVersion)" } else { "order's software has no Plugins line" }
    $ownLbl = New-Control Label 140 (128 + $dy) 340 20 $own
    $ownLbl.ForeColor = $colorGray
    $f.Controls.Add($ownLbl)

    $warn = New-Control Label 16 (160 + $dy) 470 60 ''
    if ($TestMode) {
        $warn.Text = "TEST MODE: the USB stick is not touched. Everything else runs for real."
        $warn.ForeColor = $colorOrange
    } else {
        $warn.Text = "USB $($Drive.Letter) will be ERASED and labelled $($Order.OrderNumber).`r`n$($Drive.Display)"
        $warn.ForeColor = $colorRed
    }
    $warn.Font = $fontBold
    $f.Controls.Add($warn)

    $ok = New-Control Button 230 (236 + $dy) 150 30 'Create upgrade USB'
    $ok.DialogResult = 'OK'
    $cancel = New-Control Button 390 (236 + $dy) 100 30 'Cancel'
    $cancel.DialogResult = 'Cancel'
    $f.Controls.AddRange(@($ok, $cancel))
    $f.AcceptButton = $ok; $f.CancelButton = $cancel
    $f.Height = 330 + $dy
    # At least one application must stay ticked. ItemCheck fires before the change, so count ahead.
    $chk.Tag = $ok
    $chk.Add_ItemCheck({
        param($sender, $e)
        $after = $sender.CheckedItems.Count + $(if ($e.NewValue -eq 'Checked') { 1 } else { -1 })
        $sender.Tag.Enabled = $after -gt 0
    })
    $f.Tag = @{ Combo = $cmb; Plugins = $Plugins; Apps = $chk }
    return $f
}

function Get-CheckedApplications {
    param($ConfirmForm)
    $list = $ConfirmForm.Tag.Apps
    $names = @()
    foreach ($i in $list.CheckedItems) { $names += [string]$i }
    return , $names
}

# ---------------------------------------------------------------------------------------------
# Progress + results window (U5, U6)
# ---------------------------------------------------------------------------------------------
function New-ProgressForm {
    param([string]$Title, [object[]]$Steps)
    $f = New-Object System.Windows.Forms.Form
    $f.Text = $Title
    $f.Size = New-Object System.Drawing.Size(640, 520)
    $f.FormBorderStyle = 'FixedDialog'; $f.MaximizeBox = $false; $f.MinimizeBox = $false
    $f.StartPosition = 'CenterParent'; $f.Font = $font

    $header = New-Control Label 16 12 600 28 $Title $fontOutcome
    $sub = New-Control Label 16 42 600 20 'Working...'
    $sub.ForeColor = $colorGray

    $list = New-Control ListView 16 66 600 248
    $list.View = 'Details'; $list.FullRowSelect = $true; $list.HeaderStyle = 'None'
    [void]$list.Columns.Add('', 28)
    [void]$list.Columns.Add('Step', 250)
    [void]$list.Columns.Add('Result', 300)
    $rows = @{}
    foreach ($s in $Steps) {
        $item = New-Object System.Windows.Forms.ListViewItem('')
        [void]$item.SubItems.Add($s.Caption)
        [void]$item.SubItems.Add('')
        if ($s.Id -eq 'line') { $item.ForeColor = $colorGray }
        [void]$list.Items.Add($item)
        $rows[$s.Id] = $item
    }

    $results = New-Control TextBox 16 322 600 96
    $results.Multiline = $true; $results.ReadOnly = $true; $results.ScrollBars = 'Vertical'
    $results.Visible = $false

    $details = New-Control TextBox 16 466 600 180
    $details.Multiline = $true; $details.ReadOnly = $true; $details.ScrollBars = 'Both'; $details.WordWrap = $false
    $details.Font = New-Object System.Drawing.Font('Consolas', 8.5)
    $details.Visible = $false

    $btnDetails = New-Control Button 16 428 130 28 'Show details  v'
    $btnClose = New-Control Button 516 428 100 28 'Cancel'

    $f.Controls.AddRange(@($header, $sub, $list, $results, $details, $btnDetails, $btnClose))
    $ctx = @{
        Form = $f; Header = $header; Sub = $sub; List = $list; Rows = $rows; Results = $results
        Details = $details; BtnDetails = $btnDetails; BtnClose = $btnClose; Tick = 0; LogIndex = 0
        Done = $false; Writing = $false; Sync = $null; PowerShell = $null; Handle = $null; Timer = $null
    }
    $f.Tag = $ctx

    $btnDetails.Add_Click({
        $c = $this.FindForm().Tag
        $show = -not $c.Details.Visible
        $c.Details.Visible = $show
        $c.BtnDetails.Text = if ($show) { 'Hide details  ^' } else { 'Show details  v' }
        $c.Form.Height = if ($show) { 700 } else { 520 }
    })
    $btnClose.Add_Click({
        $c = $this.FindForm().Tag
        if ($c.Done) { $c.Form.Close(); return }
        if (-not $c.Writing -and $c.Sync) {
            $c.Sync['Cancel'] = $true
            $c.BtnClose.Enabled = $false
            $c.Sub.Text = 'Cancelling after the current step...'
        }
    })
    $f.Add_FormClosing({
        param($sender, $e)
        $c = $sender.Tag
        if (-not $c.Done) {
            # Closing mid-run is a cancel request; never abandon a half-written stick.
            $e.Cancel = $true
            if (-not $c.Writing -and $c.Sync) { $c.Sync['Cancel'] = $true; $c.Sub.Text = 'Cancelling after the current step...' }
        }
    })
    return $f
}

function Update-ProgressView {
    # Called by the timer: copies the background run's state into the window.
    param($Ctx)
    $Ctx.Tick++
    $sync = $Ctx.Sync
    foreach ($id in @($Ctx.Rows.Keys)) {
        if (-not $sync.Steps.ContainsKey($id)) { continue }
        $st = $sync.Steps[$id]
        $row = $Ctx.Rows[$id]
        $row.Text = if ($id -eq 'line') { '' } else { Get-StepGlyph -Status $st.Status -Tick $Ctx.Tick }
        $row.SubItems[2].Text = [string]$st.Detail
        $row.ForeColor = switch ($st.Status) { 'failed' { $colorRed } 'warning' { $colorOrange } 'ok' { if ($id -eq 'line') { $colorGray } else { $colorGreen } } 'skipped' { $colorGray } default { [System.Drawing.SystemColors]::WindowText } }
        if ($st.Status -eq 'running' -and @('erase', 'write', 'label', 'verify') -contains $id) {
            $Ctx.Writing = $true
            $Ctx.BtnClose.Enabled = $false
            $Ctx.BtnClose.Text = 'Writing...'
            $Ctx.Sub.Text = 'Writing the USB stick - do not unplug it.'
        }
    }
    while ($Ctx.LogIndex -lt $sync.Log.Count) {
        $Ctx.Details.AppendText([string]$sync.Log[$Ctx.LogIndex] + "`r`n")
        $Ctx.LogIndex++
    }
    if ($sync.Done -and -not $Ctx.Done) { Show-Outcome -Ctx $Ctx }
}

function Show-Outcome {
    param($Ctx)
    $Ctx.Done = $true
    if ($Ctx.Timer) { $Ctx.Timer.Stop() }
    $r = $Ctx.Sync.Result
    $lines = New-Object System.Collections.Generic.List[string]
    if (-not $r) {
        $outcome = 'Failed'
        $lines.Add("x  The run stopped unexpectedly: $($Ctx.Sync.Error)")
    } else {
        $outcome = $r.Outcome
        foreach ($i in $r.Items) {
            $mark = switch ($i.Severity) { 'Failed' { 'x' } 'Warning' { '!' } default { 'i' } }
            $lines.Add("$mark  $($i.Text)")
            if ($i.Detail) { $lines.Add("     $($i.Detail)") }
        }
    }
    $written = $r -and $r.Written
    $testRun = $r -and $r.TestMode
    switch ($outcome) {
        'Succeeded' {
            $Ctx.Header.ForeColor = $colorGreen
            if ($testRun) { $Ctx.Header.Text = 'TEST RUN OK - nothing was written'; $Ctx.Sub.Text = 'Everything above the line ran for real; the USB stick was not touched.' }
            else { $Ctx.Header.Text = 'SUCCEEDED - upgrade USB created'; $Ctx.Sub.Text = "USB $($r.TargetRoot) labelled $($r.Label), written and verified." }
        }
        'Warning' {
            $Ctx.Header.ForeColor = $colorOrange
            $Ctx.Header.Text = if ($testRun) { 'TEST RUN - with warnings' } else { 'WARNING - upgrade USB created' }
            $Ctx.Sub.Text = 'Look at the items below before using the stick.'
        }
        'Cancelled' {
            $Ctx.Header.ForeColor = $colorGray
            $Ctx.Header.Text = 'CANCELLED - USB not touched'
            $Ctx.Sub.Text = ''
        }
        default {
            $Ctx.Header.ForeColor = $colorRed
            if ($written) { $Ctx.Header.Text = 'FAILED - the USB stick is NOT usable'; $Ctx.Sub.Text = 'Writing started but did not finish correctly. Fix the cause and run it again.' }
            else { $Ctx.Header.Text = 'FAILED - USB not touched'; $Ctx.Sub.Text = 'Fix what is listed below and run it again.' }
        }
    }
    if ($lines.Count -eq 0) { $lines.Add('No warnings.') }
    $Ctx.Results.Text = ($lines -join "`r`n")
    $Ctx.Results.Visible = $true
    $Ctx.BtnClose.Text = 'Close'
    $Ctx.BtnClose.Enabled = $true
    $Ctx.Form.AcceptButton = $Ctx.BtnClose
    if ($Ctx.PowerShell) {
        try { [void]$Ctx.PowerShell.EndInvoke($Ctx.Handle) } catch { }
        $Ctx.PowerShell.Runspace.Dispose()
        $Ctx.PowerShell.Dispose()
    }
}

function Start-UpgradeRun {
    # Runs Invoke-IubUpgradeUsb in a background runspace so the window stays responsive.
    param($Ctx, [string]$Order, [string]$TargetRoot, [string]$Plugin, [string[]]$Applications, [bool]$TestMode)
    $sync = [hashtable]::Synchronized(@{
        Steps = [hashtable]::Synchronized(@{}); Log = [System.Collections.ArrayList]::Synchronized((New-Object System.Collections.ArrayList))
        Done = $false; Cancel = $false; Result = $null; Error = $null
    })
    $Ctx.Sync = $sync
    $bg = {
        param($EnginePath, $Order, $TargetRoot, $Plugin, $Applications, $TestMode, $Sync)
        try {
            . $EnginePath
            $onStep = { param($id, $status, $detail) $Sync.Steps[$id] = @{ Status = $status; Detail = [string]$detail } }.GetNewClosure()
            $onLog = { param($line) [void]$Sync.Log.Add(('{0:HH:mm:ss}  {1}' -f (Get-Date), $line)) }.GetNewClosure()
            $Sync.Result = Invoke-IubUpgradeUsb -OrderNumber $Order -TargetRoot $TargetRoot -PluginVersion $Plugin `
                -ApplicationFolders $Applications -OnStep $onStep -OnLog $onLog -CancelToken $Sync -WhatIf:$TestMode
        } catch {
            $Sync.Error = $_.Exception.Message
        } finally {
            $Sync.Done = $true
        }
    }
    $rs = [runspacefactory]::CreateRunspace()
    $rs.Open()
    $ps = [powershell]::Create()
    $ps.Runspace = $rs
    [void]$ps.AddScript($bg).AddArgument($ui.EnginePath).AddArgument($Order).AddArgument($TargetRoot).AddArgument($Plugin).AddArgument($Applications).AddArgument($TestMode).AddArgument($sync)
    $Ctx.PowerShell = $ps
    $Ctx.Handle = $ps.BeginInvoke()

    $timer = New-Object System.Windows.Forms.Timer
    $timer.Interval = 200
    $timer.Tag = $Ctx
    $timer.Add_Tick({ Update-ProgressView -Ctx $this.Tag })
    $Ctx.Timer = $timer
    $timer.Start()
}

# ---------------------------------------------------------------------------------------------
# Main window (U1-U4)
# ---------------------------------------------------------------------------------------------
function New-MainForm {
    $f = New-Object System.Windows.Forms.Form
    $f.Text = 'Installer USB Builder'
    $f.Size = New-Object System.Drawing.Size(560, 440)
    $f.FormBorderStyle = 'FixedSingle'; $f.MaximizeBox = $false
    $f.StartPosition = 'CenterScreen'; $f.Font = $font

    $f.Controls.Add((New-Control Label 16 12 360 26 'Installer USB Builder' $fontTitle))
    if ($ui.TestMode) {
        $t = New-Control Label 16 38 510 18 'TEST MODE - nothing is written to a USB stick' $fontBold
        $t.ForeColor = $colorOrange
        $f.Controls.Add($t)
    }

    $f.Controls.Add((New-Control Label 16 66 100 20 'Order number:'))
    $txt = New-Control TextBox 120 63 110 24
    $txt.MaxLength = 8
    $btnLookup = New-Control Button 240 62 80 26 'Look up'
    $info = New-Control Label 120 92 410 52 'Type the 8-digit order number and press Enter.'
    $info.ForeColor = $colorGray

    $f.Controls.Add((New-Control Label 16 154 100 20 'USB stick:'))
    $cmb = New-Control ComboBox 120 151 330 24
    $cmb.DropDownStyle = 'DropDownList'
    $btnRefresh = New-Control Button 456 150 74 26 'Refresh'
    $erase = New-Control Label 120 178 410 20 ''
    $erase.Font = $fontBold

    $btnCheck = New-Control Button 120 210 160 32 'Check only'
    $btnCreate = New-Control Button 290 210 160 32 'Create installer'
    $btnCheck.Enabled = $false; $btnCreate.Enabled = $false

    $sep = New-Control Label 16 256 514 2 ''
    $sep.BorderStyle = 'Fixed3D'
    $f.Controls.Add((New-Control Label 16 272 100 20 'Later:'))
    $btnPrepare = New-Control Button 120 268 160 28 'Prepare PC for shipping'
    $btnVerify = New-Control Button 290 268 160 28 'Verify installation'
    $btnPrepare.Enabled = $false; $btnVerify.Enabled = $false
    $f.Controls.Add((New-Control Label 16 310 100 20 'Other:'))
    $btnUpgrade = New-Control Button 120 306 200 28 'Software upgrade USB'
    $btnUpgrade.Enabled = $false

    $status = New-Control Label 16 352 514 34 'Phase 2b: only "Software upgrade USB" is available. Check only comes in Phase 1, the delivery functions in Phase 3.'
    $status.ForeColor = $colorGray

    $tip = New-Object System.Windows.Forms.ToolTip
    $tip.SetToolTip($btnCheck, 'Not built yet (Phase 1).')
    $tip.SetToolTip($btnCreate, 'Not built yet (Phase 3).')
    $tip.SetToolTip($btnPrepare, 'Not built yet (Phase 3).')
    $tip.SetToolTip($btnVerify, 'Not built yet (Phase 3).')
    $tip.SetToolTip($btnUpgrade, 'Plugin installer + this order''s software from SVN, nothing else. For R&D field upgrades.')

    $f.Controls.AddRange(@($txt, $btnLookup, $info, $cmb, $btnRefresh, $erase, $btnCheck, $btnCreate, $sep, $btnPrepare, $btnVerify, $btnUpgrade, $status))
    $f.AcceptButton = $btnLookup

    $ui.Main = @{ Form = $f; Order = $txt; Lookup = $btnLookup; Info = $info; Drive = $cmb; Erase = $erase; Upgrade = $btnUpgrade; Refresh = $btnRefresh }

    $btnLookup.Add_Click({ Invoke-OrderLookup })
    $txt.Add_TextChanged({
        if ($ui.Order -and $ui.Main.Order.Text -ne $ui.Order.OrderNumber) {
            $ui.Order = $null; $ui.SoftwareInfo = $null
            $ui.Main.Info.Text = 'Press Enter to look up the order.'
            $ui.Main.Info.ForeColor = $colorGray
            Update-MainButtons
        }
    })
    $btnRefresh.Add_Click({ Update-DriveList })
    $cmb.Add_SelectedIndexChanged({ Update-EraseText; Update-MainButtons })
    $btnUpgrade.Add_Click({ Invoke-UpgradeFlow })

    # Sticks get plugged in while the window is open: re-list them every two seconds.
    $poll = New-Object System.Windows.Forms.Timer
    $poll.Interval = 2000
    $poll.Add_Tick({ if ($ui.Main.Form.ContainsFocus) { Update-DriveList -Quiet } })
    $f.Add_Shown({ Update-DriveList; $ui.Main.Order.Focus() })
    $f.Add_FormClosed({ $ui.Poll.Stop(); $ui.Poll.Dispose() })
    $ui.Poll = $poll
    return $f
}

function Update-DriveList {
    param([switch]$Quiet)
    $drives = @(Get-IubRemovableDrives)
    $old = @($ui.Drives | ForEach-Object Display) -join '|'
    $new = @($drives | ForEach-Object Display) -join '|'
    if ($Quiet -and $old -eq $new) { return }
    $cmb = $ui.Main.Drive
    $selected = if ($cmb.SelectedIndex -ge 0 -and $cmb.SelectedIndex -lt $ui.Drives.Count) { $ui.Drives[$cmb.SelectedIndex].Letter } else { $null }
    $ui.Drives = $drives
    $cmb.Items.Clear()
    foreach ($d in $drives) { [void]$cmb.Items.Add($d.Display) }
    $index = -1
    for ($i = 0; $i -lt $drives.Count; $i++) { if ($drives[$i].Letter -eq $selected) { $index = $i } }
    if ($index -lt 0 -and $drives.Count -eq 1) { $index = 0 }
    $cmb.SelectedIndex = $index
    Update-EraseText
    Update-MainButtons
}

function Update-EraseText {
    $cmb = $ui.Main.Drive
    $lbl = $ui.Main.Erase
    if ($ui.Drives.Count -eq 0) {
        $lbl.Text = 'No USB stick found - plug one in.'
        $lbl.ForeColor = $colorGray
    } elseif ($cmb.SelectedIndex -lt 0) {
        $lbl.Text = 'Pick the USB stick to use.'
        $lbl.ForeColor = $colorGray
    } elseif ($ui.TestMode) {
        $lbl.Text = 'Test mode: this stick will not be touched.'
        $lbl.ForeColor = $colorOrange
    } else {
        $lbl.Text = "! everything on $($ui.Drives[$cmb.SelectedIndex].Letter) is erased"
        $lbl.ForeColor = $colorRed
    }
}

function Update-MainButtons {
    $ui.Main.Upgrade.Enabled = [bool]$ui.Order -and ($ui.TestMode -or $ui.Main.Drive.SelectedIndex -ge 0)
}

function Invoke-OrderLookup {
    $order = $ui.Main.Order.Text.Trim()
    $info = $ui.Main.Info
    if ($order -notmatch '^\d{8}$') {
        $info.Text = 'An order number is 8 digits, e.g. 99445669.'
        $info.ForeColor = $colorRed
        return
    }
    $form = $ui.Main.Form
    $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
    $info.Text = "Looking up $order in SVN..."
    $info.ForeColor = $colorGray
    $form.Refresh()
    try {
        # A quick probe first, so a missing VPN shows in seconds instead of a frozen window.
        if (-not (Test-IubTcp -HostName ([Uri](Get-IubConfig).SvnTrunkUrl).Host -Port 443)) {
            throw 'SVN server not reachable from this PC (VPN / lab network?).'
        }
        $o = Resolve-IubOrder -OrderNumber $order
        $ui.Order = $o
        $ui.SoftwareInfo = Get-IubSoftwareInfo -Order $o
        $msg = if ($o.Message.Length -gt 60) { $o.Message.Substring(0, 57) + '...' } else { $o.Message }
        $sn = if ($o.Serial) { "sn $($o.Serial)" } else { 'no serial in the folder name' }
        $apps = @($o.ApplicationFolders)
        $appText = if ($apps.Count -gt 1) { "$($apps.Count) applications" } else { "application '$($apps[0])'" }
        $info.Text = ("{0}`r`n{1}, {2}   last commit r{3}, {4:yyyy-MM-dd}, {5}`r`n""{6}""" -f $o.FolderName, $sn, $appText, $o.Revision, $o.Date, $o.Author, $msg)
        $info.ForeColor = [System.Drawing.SystemColors]::ControlText
    } catch {
        $ui.Order = $null
        $info.Text = $_.Exception.Message
        $info.ForeColor = $colorRed
    } finally {
        $form.Cursor = [System.Windows.Forms.Cursors]::Default
        Update-MainButtons
    }
}

function Invoke-UpgradeFlow {
    $o = $ui.Order
    if (-not $o) { return }
    $main = $ui.Main.Form
    $drive = if ($ui.Main.Drive.SelectedIndex -ge 0) { $ui.Drives[$ui.Main.Drive.SelectedIndex] } else { $null }
    if (-not $drive -and -not $ui.TestMode) { return }
    $main.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
    try { $plugins = @(Get-IubReleases -Kind Plugin) } finally { $main.Cursor = [System.Windows.Forms.Cursors]::Default }
    if ($plugins.Count -eq 0) {
        [void][System.Windows.Forms.MessageBox]::Show($main, 'No plugin release zip found on \\build or in the archive.', 'Software upgrade USB', 'OK', 'Error')
        return
    }
    $confirm = New-UpgradeConfirmForm -Order $o -SoftwareInfo $ui.SoftwareInfo -Drive $drive -Plugins $plugins -TestMode $ui.TestMode
    $answer = $confirm.ShowDialog($main)
    $pick = $plugins[$confirm.Tag.Combo.SelectedIndex]
    $apps = Get-CheckedApplications -ConfirmForm $confirm
    $confirm.Dispose()
    if ($apps.Count -eq 0) { return }
    if ($answer -ne 'OK') { return }

    # In test mode without a stick the target only has to look like a drive; it is never touched.
    $root = if ($drive) { $drive.Root } else { 'Z:\' }
    $title = if ($drive) { "Software upgrade USB - $($o.OrderNumber)  ->  $root" } else { "Software upgrade USB - $($o.OrderNumber)  (test, no stick)" }
    $progress = New-ProgressForm -Title $title -Steps @(Get-IubUpgradeSteps)
    $ui.Poll.Stop()
    try {
        Start-UpgradeRun -Ctx $progress.Tag -Order $o.OrderNumber -TargetRoot $root -Plugin $pick.Version -Applications $apps -TestMode $ui.TestMode
        [void]$progress.ShowDialog($main)
    } finally {
        $progress.Dispose()
        $ui.Poll.Start()
        Update-DriveList
    }
}

# ---------------------------------------------------------------------------------------------
# Smoke test: build every form and render a finished run from fake data, without showing anything.
# ---------------------------------------------------------------------------------------------
if ($SmokeTest) {
    $main = New-MainForm
    $fakeOrder = [pscustomobject]@{ OrderNumber = '99367208'; FolderName = '99367208 ARE test'; ApplicationFolders = @('99367208 216104 BOD', '99367208 216104 WATERS'); Serial = '216104'; Revision = 40050; Author = 'Lab'; Date = Get-Date; Message = 'test' }
    $fakeDrive = [pscustomobject]@{ Letter = 'E:'; Root = 'E:\'; Display = 'E:  14.9 GB  FAT32  "OLD"' }
    $fakePlugins = @([pscustomobject]@{ Version = '1.79.4'; Location = 'Release'; IsLatest = $true }, [pscustomobject]@{ Version = '1.79.3'; Location = 'Archive'; IsLatest = $false })
    $confirm = New-UpgradeConfirmForm -Order $fakeOrder -SoftwareInfo ([pscustomobject]@{ PluginsVersion = '1.79.3.0' }) -Drive $fakeDrive -Plugins $fakePlugins -TestMode $false
    $picked = Get-CheckedApplications -ConfirmForm $confirm
    if ($picked.Count -ne 2) { throw "smoke: expected both application folders ticked, got $($picked.Count)" }
    "smoke confirm: $($picked -join ' + ') ticked, form height $($confirm.Height)"
    foreach ($outcome in 'Succeeded', 'Warning', 'Failed', 'Cancelled') {
        $p = New-ProgressForm -Title 'smoke' -Steps @(Get-IubUpgradeSteps)
        $ctx = $p.Tag
        $ctx.Sync = @{ Steps = @{ network = @{ Status = 'ok'; Detail = '' }; erase = @{ Status = 'running'; Detail = '' }; verify = @{ Status = 'failed'; Detail = 'x' } }
                       Log = [System.Collections.ArrayList]@('line 1', 'line 2'); Done = $true; Error = $null
                       Result = [pscustomobject]@{ Outcome = $outcome; Written = $true; TestMode = $false; TargetRoot = 'E:\'; Label = '99445669'
                                                   Items = @((New-IubItem Warning 'w' 'detail'), (New-IubItem Info 'i')) } }
        Update-ProgressView -Ctx $ctx
        # (Visible reads false on a form that was never shown, so check the content instead.)
        if (-not $ctx.Done -or -not $ctx.Results.Text -or $ctx.Details.Lines.Count -lt 2 -or $ctx.BtnClose.Text -ne 'Close') { throw "smoke: progress view did not finish for $outcome" }
        "smoke $outcome : '$($ctx.Header.Text)'"
        $p.Dispose()
    }
    # With -OrderNumber: a real test-mode run through the background runspace, as the window does it.
    if ($OrderNumber) {
        $p = New-ProgressForm -Title 'smoke live' -Steps @(Get-IubUpgradeSteps)
        $ctx = $p.Tag
        Start-UpgradeRun -Ctx $ctx -Order $OrderNumber -TargetRoot 'Z:\' -Plugin '' -TestMode $true
        $deadline = (Get-Date).AddMinutes(5)
        while (-not $ctx.Done -and (Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 200
            Update-ProgressView -Ctx $ctx
        }
        if (-not $ctx.Done) { throw 'smoke live: the background run did not finish within 5 minutes' }
        "smoke live: '$($ctx.Header.Text)'"
        foreach ($id in $ctx.Rows.Keys) { "   {0,-8} {1,-2} {2}" -f $id, $ctx.Rows[$id].Text, $ctx.Rows[$id].SubItems[2].Text }
        "   log lines: $($ctx.Details.Lines.Count)"
        $ctx.Results.Text -split "`r`n" | ForEach-Object { "   | $_" }
        $p.Dispose()
    }
    $confirm.Dispose(); $main.Dispose()
    'smoke ok'
    exit 0
}

$main = New-MainForm
[void]$main.ShowDialog()
$main.Dispose()
