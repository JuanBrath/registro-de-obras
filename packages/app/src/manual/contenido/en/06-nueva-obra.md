# Adding a new artwork

Step by step through the **New artwork** form: image, general details, category, editions and copies.

## Opening the form

In **Artworks**, click **New artwork**. To leave without saving, click the **✕** or **Cancel and go back**.

## Step 1: the image

1. Under **Artwork image** click **Choose image…** and pick a file.
2. Accepted formats: **JPG, PNG, GIF, WEBP, PSD, PSB and TIFF**.
3. A JPG, PNG, GIF or WEBP is used as it is (if it's very large, the program shrinks it on its own to a maximum of 2400 pixels on the longest side, which is enough to view it with quality full screen). You don't need to upload the original at full resolution.

If you choose a **PSD, PSB or TIFF**, the program generates a JPG on its own from the file's real image, up to 2400 pixels on the longest side and with the colors converted to sRGB, so it looks good full screen. It stores it in your records; the original file is not touched or copied. It's fast even with multi-gigabyte files. A notice shows the size of the generated JPG.

> A PSD or PSB must contain the composite image, which Photoshop saves with the **Maximize Compatibility** option. If the program can't generate it, it uses the small preview stored inside the file and warns you that it may look different from the final artwork; if the file doesn't have one either, turn on **Image Previews** in Photoshop's preferences and save it again, or choose a JPG.

## Step 2: the general details

- **Title**: required.
- **Subtitle**: alternative titles, if it has any.
- **Inventory code / SKU**: an identifier of your own for the artwork, useful for sorting and searching.
- **Year / Period**: the exact year or a range, for example 2024-2025.
- **Notes**: free text.

In Galeris Studio the artwork is registered under your name: at the top of the form you see "Artist: your name", with an **Edit my info** button that takes you to your profile.

## Step 3: the category

Choose the **Category**. When you choose it, the fields specific to that category appear:

- **Photography and Alternative Processes**
- **Painting and Mixed Media**
- **Original Graphic Work (Prints and Engraving)**
- **Sculpture and Three-Dimensional Art**
- **Drawing and Works on Paper**
- **Textile Art and Ceramics**
- **New Media, Video Art and Installations**

Each category has its **subtypes** (for example, in Photography: classic analog, digital Fine Art, 19th-century historical processes, photobooks and portfolios, synthography) and a **rigorous record** with specific technical details. They are all optional except those the program marks as required. The ⓘ tips explain each one.

### If the artwork is a photograph

- Choose the **Subtype**. Depending on which one it is, the fields that follow change.
- **Capture date** (in synthography it's called **Creation date**), **Edition year**, **Series or project** and **Technique**.
- **Capture data**: camera, ISO, shutter speed, aperture and focal length. They don't appear in synthography (which has no such data).
- **Original file location**: for digital photographs, choose the file the artwork is printed from. If the file is **JPEG, TIFF, HEIC, PSD/PSB or camera RAW (CR2, NEF, ARW, ORF, DNG)**, the program fills in on its own the capture date, the editing software, the camera data and the **keywords** (which become tags). In a new artwork it also takes the **star rating** the file already has (for example, set from Lightroom or Bridge). With other RAW formats (such as CR3 or RAF) that data isn't read automatically yet, but you can fill it in by hand. After that, the data lives in Galeris: changing it here doesn't modify the file, nor the other way around. In the other subtypes, this field is free text called **Negative location**.
- **Synthography** (art generated entirely by artificial intelligence): it has no camera data. The certificates for these artworks carry the legend **NO COPYRIGHT** at the bottom (**SIN COPYRIGHT** in Spanish), instead of the artist's copyright. See [Certificate of authenticity](cap:certificado).
- In Galeris Studio you also see the **Editing software** field.

## Step 4: tags

In **Tags** choose an existing one or type a new one. Tags belong to Galeris: they are used to classify and search inside the program, but they are not written into the original file.

## Step 5: unique artwork or edition

1. Under **Is an edition** choose **Unique artwork** or **Edition artwork**. (In Graphic Work this is decided automatically by the subtype: for example, the monotype is unique and the other techniques are editions.)
2. If it's an edition, fill in the **Total edition size**. The program automatically creates the numbered copies 1/N, 2/N… N/N.
3. Only for editions, the edition's reference size appears: in Photography, first **Size scale** (if the edition is split into different sizes, it is recorded here; if you choose **No**, fill in the **Image size (mm)**); in the other categories, **Dimensions** directly. A unique artwork doesn't need this: the size of its single copy, filled in on the next step, is enough.
4. Tick **Any artist's proofs?** if it applies and enter the **Number of artist's proofs**. Artist's proofs (AP) sit outside the commercial numbering. The usual rule is 10% of the edition, rounded up: for 7 pieces that's 1 AP and for 25 pieces, 3 AP. If you enter more than that, the program shows a warning. By convention APs are not sold. See [Copies and statuses](cap:copias).

A unique artwork is, internally, an edition of a single copy.

## Step 6: the details of each copy (optional)

When you choose unique or edition, a row appears for each copy and for each artist's proof, with the note "Fill in whatever you already know about each copy — you can leave fields blank and complete them later". They are filled in the same way as when you edit a copy. See [Copies and statuses](cap:copias).

## Another way: adding the artwork from Lightroom Classic

If you use Lightroom Classic, you can send the photo directly and this form opens with the image and the details already loaded. It's optional. See [Lightroom Classic](cap:lightroom-classic).

## Step 7: save

Click **Save artwork**. If something required is missing, the program tells you what: choose the category, choose whether the artwork is unique or an edition, or type the title.

When it saves you see the message “Title” saved successfully (and how many editions were generated) with three buttons:

- **Add another artwork**: goes back to an empty form.
- **View this artwork**: opens its sheet.
- **Back to artworks**: goes back to the list.
