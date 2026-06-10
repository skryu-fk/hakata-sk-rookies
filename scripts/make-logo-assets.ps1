# Logo asset generator (ASCII only to avoid PS5.1 encoding issues)
# Generates from hksk_logo.png / sk_logo.png:
#   public/hksk_logo_crop.png  - trimmed wordmark (header)
#   public/sk_logo_crop.png    - trimmed lockup (hero/footer)
#   public/sk_mark.png         - SK mark only (no text)
#   src/app/icon.png           - favicon (transparent square)
#   src/app/apple-icon.png     - iOS home screen icon (navy bg)

$ErrorActionPreference = "Stop"

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class ImgTool {
    static byte[] GetArgb(Bitmap bmp, out int stride) {
        var rect = new Rectangle(0, 0, bmp.Width, bmp.Height);
        var data = bmp.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        stride = data.Stride;
        var bytes = new byte[data.Stride * data.Height];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
        bmp.UnlockBits(data);
        return bytes;
    }

    public static Rectangle GetBounds(Bitmap bmp, byte thr) {
        int stride;
        var px = GetArgb(bmp, out stride);
        int minX = bmp.Width, minY = bmp.Height, maxX = -1, maxY = -1;
        for (int y = 0; y < bmp.Height; y++) {
            int row = y * stride;
            for (int x = 0; x < bmp.Width; x++) {
                if (px[row + x * 4 + 3] > thr) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0) return Rectangle.Empty;
        return Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
    }

    static Rectangle Pad(Rectangle r, int pad, int w, int h) {
        int l = Math.Max(0, r.Left - pad), t = Math.Max(0, r.Top - pad);
        int rr = Math.Min(w, r.Right + pad), b = Math.Min(h, r.Bottom + pad);
        return Rectangle.FromLTRB(l, t, rr, b);
    }

    public static int[] CropSave(string src, string dst, int pad) {
        using (var bmp = new Bitmap(src)) {
            var r = Pad(GetBounds(bmp, 16), pad, bmp.Width, bmp.Height);
            using (var outBmp = bmp.Clone(r, PixelFormat.Format32bppArgb)) {
                outBmp.Save(dst, ImageFormat.Png);
            }
            return new[] { r.Width, r.Height };
        }
    }

    // Scan content row-blocks top-down and crop only the first block (= the SK mark).
    public static int[] CropTopBlockSave(string src, string dst, int pad) {
        using (var bmp = new Bitmap(src)) {
            var bounds = GetBounds(bmp, 16);
            int stride;
            var px = GetArgb(bmp, out stride);
            int blockEnd = -1; bool inBlock = false; int gapRun = 0;
            int minGap = Math.Max(4, bounds.Height / 25);
            for (int y = bounds.Top; y < bounds.Bottom; y++) {
                int cnt = 0; int row = y * stride;
                for (int x = bounds.Left; x < bounds.Right; x++)
                    if (px[row + x * 4 + 3] > 16) { cnt++; if (cnt > 2) break; }
                bool has = cnt > 2;
                if (has) {
                    if (inBlock && gapRun >= minGap) break;
                    inBlock = true; gapRun = 0; blockEnd = y;
                } else if (inBlock) {
                    gapRun++;
                }
            }
            if (blockEnd < 0) blockEnd = bounds.Bottom - 1;
            var r = Rectangle.FromLTRB(bounds.Left, bounds.Top, bounds.Right, blockEnd + 1);
            int minX = bmp.Width, maxX = -1;
            for (int y = r.Top; y < r.Bottom; y++) {
                int row = y * stride;
                for (int x = r.Left; x < r.Right; x++) {
                    if (px[row + x * 4 + 3] > 16) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                    }
                }
            }
            r = Rectangle.FromLTRB(minX, r.Top, maxX + 1, r.Bottom);
            r = Pad(r, pad, bmp.Width, bmp.Height);
            using (var outBmp = bmp.Clone(r, PixelFormat.Format32bppArgb)) {
                outBmp.Save(dst, ImageFormat.Png);
            }
            return new[] { r.Width, r.Height };
        }
    }

    public static void SquareIconSave(string src, string dst, int size, string bgHex, double fit) {
        using (var srcBmp = new Bitmap(src))
        using (var outBmp = new Bitmap(size, size, PixelFormat.Format32bppArgb))
        using (var g = Graphics.FromImage(outBmp)) {
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            if (!string.IsNullOrEmpty(bgHex)) {
                using (var b = new SolidBrush(ColorTranslator.FromHtml(bgHex)))
                    g.FillRectangle(b, 0, 0, size, size);
            }
            double scale = Math.Min(size * fit / srcBmp.Width, size * fit / srcBmp.Height);
            int w = (int)Math.Round(srcBmp.Width * scale);
            int h = (int)Math.Round(srcBmp.Height * scale);
            g.DrawImage(srcBmp, (size - w) / 2, (size - h) / 2, w, h);
            outBmp.Save(dst, ImageFormat.Png);
        }
    }
}
"@

$pub = "C:\Users\KAITO\Downloads\youtubetube\hakata-rookies\public"
$app = "C:\Users\KAITO\Downloads\youtubetube\hakata-rookies\src\app"

$d1 = [ImgTool]::CropSave("$pub\hksk_logo.png", "$pub\hksk_logo_crop.png", 6)
Write-Output ("hksk_logo_crop.png: {0}x{1}" -f $d1[0], $d1[1])

$d2 = [ImgTool]::CropSave("$pub\sk_logo.png", "$pub\sk_logo_crop.png", 10)
Write-Output ("sk_logo_crop.png: {0}x{1}" -f $d2[0], $d2[1])

$d3 = [ImgTool]::CropTopBlockSave("$pub\sk_logo.png", "$pub\sk_mark.png", 6)
Write-Output ("sk_mark.png: {0}x{1}" -f $d3[0], $d3[1])

[ImgTool]::SquareIconSave("$pub\sk_mark.png", "$app\icon.png", 512, "", 0.86)
Write-Output "icon.png: 512x512 (transparent)"

[ImgTool]::SquareIconSave("$pub\sk_mark.png", "$app\apple-icon.png", 180, "#0b1e3f", 0.72)
Write-Output "apple-icon.png: 180x180 (navy bg)"
