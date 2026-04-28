# deploy.ps1 - Build Cocos Creator game and deploy to GitHub Pages

$ProjectPath = $PSScriptRoot
$BuildOutput = "$ProjectPath\build\web-desktop"

# Find Cocos Creator executable
$CocosCreatorPaths = @(
    "C:\CocosDashboard\resources\.editors\Creator\3.8.6\CocosCreator.exe",
    "C:\Program Files\Cocos\Creator\3.8.6\CocosCreator.exe",
    "$env:LOCALAPPDATA\Programs\CocosCreator\Creator\3.8.6\CocosCreator.exe"
)

$CocosExe = $null
foreach ($path in $CocosCreatorPaths) {
    if (Test-Path $path) {
        $CocosExe = $path
        break
    }
}

# Step 1: Build
if ($CocosExe) {
    Write-Host "==> Building with Cocos Creator..." -ForegroundColor Cyan
    & $CocosExe --path "$ProjectPath" --build "platform=web-desktop;md5Cache=false"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed!"
        exit 1
    }
} else {
    Write-Host "==> Cocos Creator not found at known paths." -ForegroundColor Yellow
    Write-Host "==> Please build manually in Cocos Creator (Project > Build > Web Desktop)" -ForegroundColor Yellow
    $confirm = Read-Host "Have you already built the project? Press Y to continue deploying"
    if ($confirm -ne 'Y' -and $confirm -ne 'y') {
        exit 0
    }
}

# Step 2: Check build output exists
if (-not (Test-Path $BuildOutput)) {
    Write-Error "Build output not found at: $BuildOutput"
    Write-Host "Please build first: Project > Build > Web Desktop in Cocos Creator"
    exit 1
}

Write-Host "==> Build output found at $BuildOutput" -ForegroundColor Green

# Step 3: Commit and push
Set-Location $ProjectPath

$CommitMsg = "deploy: web build $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

git add build/web-desktop
git add assets/axie-colyseus-demo/scripts/GameClient.ts
git add .gitignore
git add render.yaml
git add .github/

git status

git commit -m $CommitMsg
if ($LASTEXITCODE -ne 0) {
    Write-Host "Nothing new to commit." -ForegroundColor Yellow
} else {
    git push origin master
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==> Deploy successful!" -ForegroundColor Green
        Write-Host "==> Game: https://khoa9894.github.io/Tomatoes-shooting/" -ForegroundColor Cyan
        Write-Host "==> Server: https://tomatoes-shooting.onrender.com" -ForegroundColor Cyan
    } else {
        Write-Error "Push failed!"
        exit 1
    }
}
