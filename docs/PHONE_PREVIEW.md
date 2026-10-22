# Phone preview over local Wi-Fi

The Studio desktop and browser builds share the same static UI. Android Chrome can edit `.xtemplate` files, including embedded image packages, on a phone on the same trusted local network as the computer. **This is a separate editor session**, not a mirrored view or a shared real-time document.

## Running a private LAN preview

From the repository on your computer:

```sh
npm run desktop:assets
ip -4 -br addr show scope global
python3 scripts/serve-lan.py --host YOUR_PC_LAN_IP --port 8766
```

Open `http://YOUR_PC_LAN_IP:8766/` on your phone, using the same Wi-Fi. The exact IP may change with DHCP or when changing networks. If the page does not open, check whether the phone is on a guest/isolated Wi-Fi and whether your PC firewall permits TCP port 8766 from your **local network only**. Do not expose this to the public internet or forward the router port.

The standalone `dist-web` browser bundle is served read-only. The server has no file upload or save endpoints; it cannot access desktop documents. To transfer templates, export a `.xtemplate` from one device, then open the downloaded file on the other device using its file picker. A template is not synchronized automatically. Saving downloads the file on the phone. LAN HTTP is not a secure context, so browser APIs requiring HTTPS (such as some clipboard features) may be unavailable. File import, editing, and export are covered by our Android-sized Chromium tests. Browser tabs hold unsaved edits in memory: **export before closing the tab**.

## Touch layout

- The canvas opens first; use **Layers** or **Properties** in the header to reveal a drawer. Selecting a layer or loading an example returns to the canvas.
- The drawing tools form a scrollable bottom rail. Pan/zoom and transform handles are touch-accessible.
- Export uses the phone browser's download handler; importing PNG/JPEG/WebP uses its file picker.
- On a phone, the JSON pane covers the preview when enabled. Toggle Split editor to return to the canvas.

## Verification

`node scripts/browser-mobile-smoke.mjs` exercises Chromium emulation at 390×844 and 360×740, including opening templates, drawer navigation, image crop Apply/Cancel and horizontal overflow. Physical Android touch/browser/network testing is still recommended.
