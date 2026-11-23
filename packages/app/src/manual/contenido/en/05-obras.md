# Artworks

The list of all your artworks: how to search, filter, sort and rate them, and how to produce a PDF list.

## Opening the list

On the home screen click **Artworks**. You see a grid with one card per artwork. If you haven't added any yet, the message "You haven't added any artworks yet." appears and you can start with **New artwork**.

## Section help

At the top right, next to the close button ✕, is the **?** button (**Help for this section**). The main screens have it: **Artworks**, **Selections**, **Clients**, **Artists**, **Sales**, the **Artwork sheet**, **New artwork** and **My info**. When you click it, two options unfold: **Visual tour** and **Search the manual**. **Search the manual** opens the manual with the search box ready to type in; when you close it you return to the screen you were on, exactly as you left it. With **Visual tour**, the program takes a tour through the buttons and options on the screen, pointing at each one with a short explanation of what you can do with it. You move forward with **Next**, go back with **Back** and close with **Skip** or **Got it**. Only the options you can see at that moment are explained (for example, the tag filter appears when some artwork has tags).

## What each card shows

- The photo of the artwork (or "No image" if it has none).
- The **title** and, if it has one, the inventory code (**SKU**).
- The category and whether it is a **unique artwork** or an **edition**.
- If it has an artist's proof, a **Has artist's proof** label.
- Its availability. For an edition you see, for example, "3/10 available" and a summary of the other copies: "2 sold", "1 reserved", "1 on display", etc. For a unique artwork you see its status.
- Below, five stars to rate it.

Click a card to open that artwork's sheet. See [Artwork sheet](cap:ficha-de-obra). Right-clicking the image (on the cards, in the columns view and also inside a selection) shows **Export image…**, with the same options as on the artwork sheet.

## Search

The search box at the top searches as you type. In Recer Studio it searches the **title**, the artwork **number** and the **inventory code**. It doesn't search inside tags: for that there is the tag filter (see below). If nothing shows up, you see the message "No artworks matched those filters."

## Filtering and sorting

Below the buttons there are several controls that combine with each other:

- **Sort by**: **Inventory number**, **Title** or **Capture date**. Artworks that don't have that data go to the end.
- **Category**: shows only the artworks of one category.
- **Subtype**: appears when there are artworks with a subtype, and adjusts to the chosen category.
- **Stars**: click a star to see only the artworks with that rating; if you click the same star again, the filter is removed. If you hold a star down for a moment, the program asks whether you want to clear the rating from all artworks.
- **Tags**: choose one or several tags to see the artworks that have them. See [Filtering by tags](cap:obras).
- **Selection**: shows only the artworks of one of your selections. See [Selections and dossier](cap:selecciones-y-dossier).

The bar with the search box and the filters stays **pinned to the top** while you scroll through the artworks (the title scrolls away), so you always see which filters are on. Filters don't delete anything: they only change what you see. To see everything again, choose the first option in each one (**All categories**, **All**) and remove the stars and the tags.

## Filtering by tags

**Tags** are words you put on each artwork to classify it (for example "landscape", "black and white", "series 2024"). They are entered in the **Tags** field of the artwork form. See [Adding a new artwork](cap:nueva-obra).

How to use the filter:

1. In **Tags**, open the **Add tag…** drop-down. There you'll find all the tags your artworks already use.
2. Choose one. It appears as a small pill to the right of the drop-down and the list narrows down to the artworks that have that tag.
3. If you want to add another, open the drop-down again and choose the next one. Each pill is added without replacing the previous ones.
4. To remove a tag from the filter, click the **×** on its pill. When none is left, you see all the artworks again.

**With several tags, the artworks that have at least one of them are shown**; they don't need to have all of them. For example, if you choose "landscape" and "black and white", you see the artworks that have "landscape", those that have "black and white" and those that have both. In other words: each tag you add **widens** what you see.

A few things to keep in mind:

- The tag filter combines with the other filters (category, subtype, stars and the search box), and there it does narrow things down: an artwork has to meet all those filters at once and, in addition, have some of the chosen tags.
- Right now there is no option to ask for "only the artworks that have all the tags". If you need to see those that have two tags at once, choose one of them and look for the other by eye in the sheet, or use a more specific tag.
- Tags belong to Recer: they are used to classify and search inside the program, but they are not written into the original file. If the file carries keywords (for example, entered in Lightroom), they are read automatically the first time you indicate its location; from then on they live only in Recer: changing them here doesn't modify the file, nor the other way around.
- The **Images** view uses exactly the same filter and the same rule. See [Images view](cap:galeria-de-obras).
- In Recer Space, the search box also searches inside the tags.

## Changing the thumbnail size

The **Thumbnail size** slider (next to the search box) changes how many artworks fit in each row. The program remembers your choice.

## Rating with stars

Click one of the five stars under an artwork to rate it. The rating is saved in Recer and, if the artwork has an **Original file location**, it is also written into that file (inside the JPG, or in an auxiliary **.xmp** file next to it if it's RAW, TIFF, PSD or another format) so that programs like Lightroom or Bridge can see it. If that second part fails, the rating is still saved in Recer and a notice is shown.

## Updating the images

If you edited an artwork's original file (for example in Lightroom or Photoshop), click **Update images**. Recer checks all the artworks and, from the original file (the one in **Original file location**), rebuilds the thumbnail and the sheet image of those modified after they were generated. It works for all three views (columns, cards and images). Unchanged ones are left alone. When it finishes it shows how many were updated and warns you if any has no original file or couldn't be read.

## Generating a PDF list

1. Filter what you want to include (the list comes out with the artworks you are viewing).
2. Click **Generate report**.
3. Choose **Summary list** or **Summary list with thumbnail**.
4. Choose the language, logo, date in the letterhead and signature. See [Reports and PDF documents](cap:informes).
5. Click **Generate** and choose where to save the PDF.

The list includes: artwork name, author, category, subcategory, number of available copies and first available copy.

## Other buttons

- **New artwork**: opens the form to add an artwork. See [Adding a new artwork](cap:nueva-obra).
- **Images** (next to Columns and Cards): shows only the photos, large, respecting the filters you have on. See [Images view](cap:galeria-de-obras).
- **Selections**: opens your hand-picked groups of artworks, the basis of the PDF dossiers. See [Selections and dossier](cap:selecciones-y-dossier).
- **Select**: turns on the checkboxes so you can tick artworks and save them to a selection. See [Selections and dossier](cap:selecciones-y-dossier).
