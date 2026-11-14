# Lightroom Classic

How to add an artwork to Recer Studio starting from a Lightroom Classic photo, and how to remove the connection.

## How it works

Recer Studio works on its own, without Lightroom. If you use Lightroom Classic, you can install an optional plug-in that adds a menu to send the selected photo: Recer Studio opens on **New artwork** with the image and the photo's details already loaded. Then you choose whether it is a unique artwork or an edition, fill in the rest and save.

## Installing the plug-in

1. In Recer Studio, click the gear ⚙ (**Settings**) and find the **Lightroom Classic** group.
2. Click **Install plug-in**. The notice "Done. Quit and reopen Lightroom Classic for the menu to appear." shows up.
3. Quit Lightroom Classic and open it again.
4. If the menu doesn't appear: in Lightroom, **File › Plug-in Manager…**, click **Add** and choose the `RecerStudio.lrplugin` folder, which is in `~/Library/Application Support/Adobe/Lightroom/Modules/`.

## Adding an artwork from Lightroom

1. In Lightroom Classic, choose the photo (for example, in the Library module).
2. Open the menu **Library › Plug-in Extras › Add artwork to Recer Studio…**. It's also under **File › Plug-in Extras**.
3. Lightroom prepares a JPG copy of the photo and opens Recer Studio.
4. Recer Studio opens **New artwork** with the details loaded. Check them, choose under **Is an edition** whether it's a **Unique artwork** or an **Edition artwork**, and click **Save artwork**. See [Adding a new artwork](cap:nueva-obra).

- The active photo (the one shown large) is sent, even if several are selected.
- Lightroom is not modified: neither the photo nor the catalog changes.
- If Recer Studio was already open, it's enough for it to come back to the front: it opens **New artwork** by itself. If you had an artwork screen open (a form or a sheet being edited), it asks before discarding it.
- If you haven't opened your records yet (you're on the welcome screen), the artwork waits: when you enter **Recer Studio**, **New artwork** opens. **My info** must be filled in. See [My profile](cap:mi-perfil).

## Which details are loaded

- **Artwork image**: a JPG copy of the photo, up to 2400 pixels on a side, with your Lightroom adjustments.
- **Title**: the photo's title in Lightroom.
- **Year / Period**: the year of the capture date.
- **Category**: **Photography and Alternative Processes**, with the digital Fine Art subtype (you can change it).
- **Capture date**, **Editing software** (Adobe Lightroom Classic) and the **Capture data**: camera, ISO, shutter speed, aperture and focal length.
- **Original file location**: the path of the Lightroom file (the file is not copied).
- **Tags**: the photo's keywords.
- **Rating**: the photo's stars.

Whatever Lightroom doesn't have stays empty. It's best to fill in the title and the keywords in Lightroom (Library module, Metadata panel).

## Opening a photo in Lightroom from Recer Studio

It also works the other way: if an artwork has its **Original file location** filled in (personal records only, digital photography), an **Lr** (**Open in Lightroom Classic**) button appears next to the field in the edit form. On the artwork's sheet (without entering edit mode) the same **Lr** button is next to **Edit artwork**, and you can also ask for it with **Open in Lightroom** from the right-click menu on the image — see [Artwork sheet](cap:ficha-de-obra). All three do the same thing: Lightroom comes to the front (opening it if it wasn't running) and, if the plug-in is installed, searches for that photo in whichever catalog you have open and selects it in the Library.

- If Lightroom can't find it (it was moved to another folder, or it belongs to a different catalog), the notice appears as a dialog inside Lightroom.
- If you just opened Lightroom, it may take a few seconds to check the request: wait a moment before trying again.
- It needs the plug-in installed and up to date (see below); if you just installed or updated it, quit and reopen Lightroom Classic once for it to start working.

> Next to the **Lr** button on the artwork's sheet, a **Ps** (**Open in Photoshop**) button may also appear, unrelated to Lightroom: it opens the original file in Adobe Photoshop. It's available for any artwork category, not just photography — see [Artwork sheet](cap:ficha-de-obra).

## If nothing is loaded

- Check that the plug-in is up to date: in Recer Studio, gear ⚙ › **Lightroom Classic**. If it says there is a newer version, click **Update plug-in** and restart Lightroom Classic.
- If Recer Studio opens but **New artwork** doesn't appear, check that **My info** is already filled in: you can't continue without it.
- If something went wrong, close Recer Studio and send the photo again from Lightroom.

## Removing the connection

1. In Recer Studio, click the gear ⚙ and, under **Lightroom Classic**, click **Remove plug-in**.
2. Restart Lightroom Classic for the menu to disappear.

Recer Studio keeps working the same as always: artworks are added by hand from **Artworks › New artwork**. See [Artworks](cap:obras).
