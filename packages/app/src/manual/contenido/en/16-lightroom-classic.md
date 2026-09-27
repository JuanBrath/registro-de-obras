# Lightroom Classic

How to add an artwork to Galeris Studio starting from a Lightroom Classic photo, and how to remove the connection.

## How it works

Galeris Studio works on its own, without Lightroom. If you use Lightroom Classic, you can install an optional plug-in that adds a menu to send the selected photo: Galeris Studio opens on **New artwork** with the image and the photo's details already loaded. Then you choose whether it is a unique artwork or an edition, fill in the rest and save.

## Installing the plug-in

1. In Galeris Studio, click the gear ⚙ (**Settings**) and find the **Lightroom Classic** group.
2. Click **Install plug-in**. The notice "Done. Quit and reopen Lightroom Classic for the menu to appear." shows up.
3. Quit Lightroom Classic and open it again.
4. If the menu doesn't appear: in Lightroom, **File › Plug-in Manager…**, click **Add** and choose the `GalerisStudio.lrplugin` folder, which is in `~/Library/Application Support/Adobe/Lightroom/Modules/`.

## Adding an artwork from Lightroom

1. In Lightroom Classic, choose the photo (for example, in the Library module).
2. Open the menu **Library › Plug-in Extras › Add artwork to Galeris Studio…**. It's also under **File › Plug-in Extras**.
3. Lightroom prepares a JPG copy of the photo and opens Galeris Studio.
4. Galeris Studio opens **New artwork** with the details loaded. Check them, choose under **Is an edition** whether it's a **Unique artwork** or an **Edition artwork**, and click **Save artwork**. See [Adding a new artwork](cap:nueva-obra).

- The active photo (the one shown large) is sent, even if several are selected.
- Lightroom is not modified: neither the photo nor the catalog changes.
- If Galeris Studio was already open, it's enough for it to come back to the front: it opens **New artwork** by itself. If you had an artwork screen open (a form or a sheet being edited), it asks before discarding it.
- If you haven't opened your records yet (you're on the welcome screen), the artwork waits: when you enter **Galeris Studio**, **New artwork** opens. **My info** must be filled in. See [My profile](cap:mi-perfil).

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

## If nothing is loaded

- Check that the plug-in is up to date: in Galeris Studio, gear ⚙ › **Lightroom Classic**. If it says there is a newer version, click **Update plug-in** and restart Lightroom Classic.
- If Galeris Studio opens but **New artwork** doesn't appear, check that **My info** is already filled in: you can't continue without it.
- If something went wrong, close Galeris Studio and send the photo again from Lightroom.

## Removing the connection

1. In Galeris Studio, click the gear ⚙ and, under **Lightroom Classic**, click **Remove plug-in**.
2. Restart Lightroom Classic for the menu to disappear.

Galeris Studio keeps working the same as always: artworks are added by hand from **Artworks › New artwork**. See [Artworks](cap:obras).
