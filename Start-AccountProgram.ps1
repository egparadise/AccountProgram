param([int]$Port = 4173)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$serverScript = Join-Path $root 'scripts\serve.mjs'

function Test-AccountProgramPort {
    param([int]$TargetPort)
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $task = $client.ConnectAsync('127.0.0.1', $TargetPort)
        if (-not $task.Wait(350)) { return $false }
        return $client.Connected
    }
    catch { return $false }
    finally { $client.Dispose() }
}

if (-not (Test-AccountProgramPort -TargetPort $Port)) {
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    Start-Process -FilePath $node -ArgumentList @("`"$serverScript`"", [string]$Port) -WorkingDirectory $root -WindowStyle Hidden

    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 250
        if (Test-AccountProgramPort -TargetPort $Port) { $ready = $true; break }
    }
    if (-not $ready) {
        Add-Type -AssemblyName PresentationFramework
        [System.Windows.MessageBox]::Show('정산ON 서버를 시작하지 못했습니다. 프로젝트의 dist 폴더와 Node.js 설치를 확인하세요.', '정산ON') | Out-Null
        exit 1
    }
}

$chromeCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
)
$chrome = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $chrome) { throw 'Google Chrome을 찾지 못했습니다.' }

Start-Process -FilePath $chrome -ArgumentList @("--app=http://127.0.0.1:$Port", '--start-maximized') -WorkingDirectory $root
