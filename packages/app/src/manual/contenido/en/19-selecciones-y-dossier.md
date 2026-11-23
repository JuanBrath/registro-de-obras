# Selections and dossier

Build groups of hand-picked artworks and use them to generate a PDF dossier (cover, biography, text, artworks with their captions and contact details), which is saved and numbered.

## What a selection is

A **selection** is a group of artworks you pick by hand, for example the ones you will take to a fair or show to a gallery. It is useful when filters are not enough: a filter may show you ten photos and you only want five. An artwork can be in several selections at once, and removing it from a selection does not delete it. Selections have an order, which is the one the dossier follows.

## Create a selection

1. In **Artworks**, click **Selections**.
2. Click **Create selection**.
3. Type the **Selection name** and, if you want, the **Notes**. Below, **all** your artworks are shown, without filters, each with a checkbox: tick the ones you want to include (above you see how many you have chosen).
4. Click **Save**. The selection appears above, under **Existing selections**, already with those artworks. If you want to build it from a filter, do it from **Artworks** (see below).

## Groups of selections

At the top of the screen there are two buttons: **Groups** and **Selections**. **Selections** shows the list and lets you create selections. **Groups** shows only the groups you created; a **group** gathers the selections on the same theme (for example "Fairs 2026" or "Landscapes").

1. Under **Groups** click **+ New group**, type the name, tick the selections that make it up and click **Save**.
2. Click a group to see the selections in it and choose one. With **Add selections to the group** you tick or untick selections (saved at once), change the name or click **Delete group** (the selections are not deleted, they just have no group).
3. You can also assign the group from a selection: open it, choose its **Group** in the drop-down (or "No group") and click **Save**. Each selection belongs to a single group.

The list of selections shows only two rows; if there are more, click **Show more** to unfold them all. When you choose one it goes back to two rows and the chosen one always stays in view.

## Add artworks to a selection

There are two ways. The most convenient for many artworks is from **Artworks**:

1. Click **Select**. A panel with the **Selection** drop-down appears.
2. Choose an existing selection or **+ New selection…** (type the name and click **Create**).
3. Tick the artworks you want to add, in cards or in columns (you can use the filters to find them). Above, clearly visible, you see how many you have chosen. The ones already in the selection appear marked and cannot be ticked again.
4. Click **Add selected**. The artworks are added to the selection. When you are done, click **Done selecting**.

The other way is from an artwork's sheet: the **Add to selection…** button lets you choose an existing selection or create a new one. See [Artwork sheet](cap:ficha-de-obra).

## View and sort a selection

In **Selections**, click a selection's name to open it. You see its artworks in the same format as in [Artworks](cap:obras): you can switch between **Columns**, **Cards** and **Images** (only the photos, with the same criterion as the artwork gallery: clicking one opens it enlarged, with arrows to move on) and change the **Thumbnail size**. The star ratings can also be changed from here.

To change the order or take artworks out, click **Sort and remove**. While the mode is on you can drag an artwork to its new position or use the arrows, and **Remove** takes the artwork out of the selection (it does not delete it); also, clicking an artwork does not open its sheet, so it does not open by mistake while dragging. When you are done, click **Done**. Outside that mode, clicking an artwork opens its sheet, and closing it takes you back to that same selection.

## Reports for a selection

In a selection, **Generate selection reports** directly opens the reports window, with only the artworks of that selection. In **Artworks** there is also a **Selection** filter to limit the list (and the reports) to one selection. See [Reports and PDF documents](cap:informes).

## Export a selection's photos

**Export photos** exports the photos of the whole selection at once, using the same criteria as **Export image** on an artwork's sheet: it always starts from each artwork's original file.

1. Open the selection and click **Export photos**.
2. Choose the **Format** (**JPG**, **TIFF** or **Original**), the **Reference side**, the **Size (in pixels)** and the copyright. By default the copyright is automatic: "© artist name and year" of each artwork; if you untick it, you type your own for all of them.
3. Click **Choose folder and export…** and choose the folder where the photos are saved.

Each photo is saved with the artwork's title as its name, and never overwrites a file that is already in the folder (if the name exists, it adds `_2`, `_3`…). Artworks without an original file loaded cannot be exported: when it finishes, the program tells you which ones were left out.

## Generate a dossier

1. Open the selection and click **Generate PDF dossier**.
2. Under **Format** choose the **Page size** (A4 or Legal (Oficio)), the **Orientation**, the **Language** (**Español**, **English** or **Spanish and English (both)**) and the **Works per page**. With **+ Add page with a different number** you can make a specific page carry more or fewer artworks.
3. Under **Cover** choose the **Cover text** (by default the artist's name), whether to add the selection name, an **Additional text (optional)** and the **Font size (pt)**.
4. Under **Texts** review the **Artist biography** and the **Statement**. Both are editable, apply only to this dossier and have the **View full** button. The statement starts empty; if you leave it empty, that page is not included.
5. Under **Caption for each work** tick what you want to show: **Artist name in each caption**, **Title and year**, **Technique**, **Dimensions**, **Price**, **Edition number** and **Artist's proofs**. For the price you can edit the text that goes **After the price** (for example "+ VAT") and the one for **When several works share a caption** ("each").
6. Under **Closing page** choose whether the **Contact at the end** is included.
7. Click **Generate PDF**. The dossier is saved automatically.

> For each artwork, the data comes from its single copy or, if it is an edition, from the first copy that is available, in stock, on exhibition, on consignment or in production. Sold, reserved, discarded, destroyed and artist's-collection copies are ignored.

> In Recer Studio the artist's name is not repeated in each caption (it is already on the cover); in Recer Space it is. You can still change it with the **Artist name in each caption** checkbox.

With **Spanish and English (both)**, the biography and the statement have one field for each language and come out on separate pages, and the fixed texts of the caption come out in both languages. Images come out in the best quality available; if an artwork only has its thumbnail, the program tells you which one.

## Saved dossiers

Each dossier you generate is saved in the records folder, with its number and date, and never overwrites a previous one. In the selection, **Saved dossiers (n)** opens the list: for each one you can **Open**, **Save a copy…** (to take it to another folder) or **Delete**.

## Delete a selection

**Delete selection** asks for confirmation in a red box. The artworks are not deleted. If the selection has saved dossiers, they are also deleted and cannot be recovered: the box warns you. You confirm with **Yes, delete**.
