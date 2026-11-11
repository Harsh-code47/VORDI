Add-Type -AssemblyName System.Drawing
$sizes = 16, 48, 128
$iconsDir = "d:\VORDI\extension\icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force
}

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $sz, $sz
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # Fill background circle with solid color
    $rect = New-Object System.Drawing.Rectangle 0, 0, $sz, $sz
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(99, 102, 241))
    $g.FillEllipse($brush, $rect)
    
    # Draw V
    $penWidth = [Math]::Max(1.5, [float]($sz / 6.0))
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), $penWidth
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    
    $p1 = New-Object System.Drawing.PointF ([float]($sz * 0.28)), ([float]($sz * 0.35))
    $p2 = New-Object System.Drawing.PointF ([float]($sz * 0.50)), ([float]($sz * 0.70))
    $p3 = New-Object System.Drawing.PointF ([float]($sz * 0.72)), ([float]($sz * 0.35))
    $g.DrawLines($pen, [System.Drawing.PointF[]]@($p1, $p2, $p3))
    
    $dest = "$iconsDir\icon$sz.png"
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $pen.Dispose()
    $brush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated $dest"
}
