# Original VYRO vector mark rendered to store/splash PNG assets.
# Run from mobile: powershell -File scripts/generate-brand.ps1
Add-Type -AssemblyName System.Drawing
$assetDirectory = Join-Path $PSScriptRoot '..\assets'
foreach ($assetName in @('icon.png', 'adaptive-icon.png', 'splash-icon.png', 'favicon.png')) {
  $bitmap = New-Object System.Drawing.Bitmap 1024,1024
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  if ($assetName -eq 'icon.png' -or $assetName -eq 'favicon.png') { $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#11182C')) }
  else { $graphics.Clear([System.Drawing.Color]::Transparent) }
  $pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#B2FF78')),32
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc(252,252,120,120,180,90); $path.AddArc(652,252,120,120,270,90)
  $path.AddArc(652,652,120,120,0,90); $path.AddArc(252,652,120,120,90,90); $path.CloseFigure()
  $graphics.DrawPath($pen, $path)
  $points = [System.Drawing.PointF[]]@([System.Drawing.PointF]::new(342,552), [System.Drawing.PointF]::new(442,622), [System.Drawing.PointF]::new(582,362), [System.Drawing.PointF]::new(682,442))
  $graphics.DrawLines($pen, $points)
  $bitmap.Save((Join-Path $assetDirectory $assetName), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose(); $pen.Dispose(); $path.Dispose()
}
