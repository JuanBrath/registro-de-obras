# Artwork sheet

Everything you see and can do when you open an artwork: view it, edit it, produce reports and delete it.

## Opening an artwork

In **Artworks**, click the artwork's card. The title is at the top; to go back use the **✕** or the button at the bottom, which returns to wherever you opened the artwork from: **Back to artworks** from the list, or **Back to the selection** if you opened it from a selection. From the [Images](cap:galeria-de-obras) view you can also open it with **View this artwork** or with right-click → **Open sheet**.

## What the sheet shows

- The image of the artwork. If you click it, it opens large. Right-clicking it (either the thumbnail or the large view) opens a menu with **Export image…**, **Open in Photoshop** and **Open in Lightroom**; see below.
- The inventory code, the artist, the category and the subtype.
- Whether it's a unique artwork or an edition (and how many editions it has).
- The main details of the artwork: technique, support, dimensions, weight…
- The **Statement** and the **Notes**: the first line is shown; click the field name to see the full text.
- Further down, the list of **Copies**: the copies of the artwork. See [Copies and statuses](cap:copias).

Below the details there are four buttons: **Edit artwork**, **Generate report**, **Add to selection…** (to add the artwork to a selection; see [Selections and dossier](cap:selecciones-y-dossier)) and **Delete artwork**. If there's an original file loaded, the **Ps** button (**Open in Photoshop**) also appears next to them, and, if it's also your own digital photo, the **Lr** button (**Open in Lightroom Classic** — see [Lightroom Classic](cap:lightroom-classic)).

## The right-click menu on the image

Right-clicking the image (the thumbnail or the large view) opens a menu with three options.

### Export image…

- If the artwork doesn't have the **Original file location** loaded, the notice "Can't export: this artwork doesn't have the original file loaded (see "Original file location" in Edit artwork)." appears and nothing opens.
- If it does, a window opens where you choose:
  - **Format**: **JPG**, **TIFF** or **Original (exact copy of the file, unchanged)**.
  - For JPG or TIFF, also: the **Color depth** (TIFF only: **8 bits** or **16 bits per channel**; JPG is always 8 bits) and the **Resize** checkbox. If you leave it unticked, the image comes out at its **original size**. If you tick it, you choose the **Reference side** (**Short side** or **Long side**), the **Unit of measure** (**Pixels** or **Centimeters**) and the **Size** of that side; in centimeters also the **Resolution (ppi)**, used to convert centimeters to pixels (for example, 30 cm at 300 ppi is 3543 pixels) and written into the file. It won't be enlarged: if the original file is smaller than this size, it's exported at its real size.
  - A **Copyright (optional)** field, suggested as "© [artist's name] [current year]"; you can delete or change it, and it's saved as metadata inside the exported file.
- Click **Export…**: it first asks where to save the new file (folder and name), and only then generates it.

> With **Original** the file is exported exactly as it is, whatever format it's in. With JPG or TIFF, the program needs to be able to read the original file: for now it works with PSD, PSB, TIFF, JPG and camera RAW (CR2, NEF, ARW, ORF, DNG).

### Open in Photoshop

Opens the original file in Adobe Photoshop (the newest copy, if there are several versions installed on the computer).

- If the artwork doesn't have the **Original file location** loaded, the notice "Can't open in Photoshop: this artwork doesn't have the original file loaded (see "Original file location" in Edit artwork)." appears and nothing else happens.
- If there's no copy of Photoshop installed on the computer, "Couldn't open the file in Photoshop. You might not have it installed on this computer." appears.

This is the same thing the **Ps** button above does: both ways are there, use whichever is more convenient.

### Open in Lightroom

This is the same as the **Lr** button (see above and [Lightroom Classic](cap:lightroom-classic)), also available from this menu.

- If the artwork doesn't have the **Original file location** loaded, the notice "Can't open in Lightroom: this artwork doesn't have the original file loaded (see "Original file location" in Edit artwork)." appears and nothing else happens.

## Editing the artwork

1. Click **Edit artwork**. The sheet turns into a form just like the one used to add artworks, with the current data. See [Adding a new artwork](cap:nueva-obra).
2. Change what you need.
3. Click **Save changes**.

Things worth knowing when editing:

- **Image**: you can change it or remove it with **Remove image**. Before saving you can change your mind with **Undo** ("The image will be removed when you save the changes.").
- **Turning a unique artwork into an edition, or the other way around**: this is only possible if the copies have no history of their own. If any of them already has a status (sold, reserved, on display…) or loaded data, the program doesn't allow it and tells you which ones they are. The same applies to a **non-editioned** artwork (sold without limit): when editing it you can switch it to **Unique artwork** or **Edition artwork** with the same criterion, that is, only if at most one of its copies has history of its own (for example, a single sale made); that copy is kept and the other, blank ones are deleted. A unique or an edition artwork can be switched to **Non-editioned**; for an edition the same criterion applies (at most one copy with history), a single copy numbered 1 is kept and the artist's proofs are preserved.
- **Lowering the number of editions or artist's proofs**: the program removes the ones with the highest numbers. It only allows it if those copies have no history of their own, and before saving it tells you exactly which ones will be removed ("This action can't be undone").
- **Adding artist's proofs**: in unique, editioned and non-editioned artworks, the artist's proofs field also lets you raise the number (even if you had deleted them all); the new ones are created blank.
- **Changing the category**: the data specific to the previous category is replaced by that of the new one.
- If you leave with unsaved changes, the program asks **Leave anyway and discard them?**, with the options **Yes, leave without saving** and **Keep editing**.

## Generating reports for the artwork

Click **Generate report**. You choose which report to produce:

- **Sheet of the piece**: all the artwork's data. If it's an edition you can include **All series** or **Choose specific series** (ticking which ones).
- **Unavailable series (detail)**: the detail of the copies that are not available (sold, reserved, on display…).
- **Available series (detail)**: the detail of the available copies.
- **Detail of the first available series**: only the first free copy.
- **Report for third parties**: meant for sharing: it doesn't include the editing software, the file's technical data or the tags.

You also choose the language, whether it carries the logo, the date in the letterhead, whether the **Notes** and the **Statement** are included (when the artwork has them) and the signature. See [Reports and PDF documents](cap:informes).

## Deleting an artwork

1. Click **Delete artwork**.
2. "Delete this artwork? This can't be undone." appears. Confirm with **Yes, delete** or cancel.

If the artwork has recorded sales, it can't be deleted, so that history isn't lost. You would first have to deal with those sales (for example, by cancelling them).
