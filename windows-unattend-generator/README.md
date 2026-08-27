# tdbnz coding Windows Unattend Generator

This is a responsive Windows 10 and Windows 11 `autounattend.xml` generator created by Thomas Bernard of **tdbnz coding**. The form and XML generation run entirely in the visitor's browser.

## GitHub Pages address

The website is configured for:

`https://tdbnz-coding.github.io/windows-unattend-generator/`

Use `windows-unattend-generator` as the repository or folder name. Keep every file in this package together and preserve the filenames.

## Publishing from the tdbnz-coding.github.io repository

If this is a folder inside the existing `tdbnz-coding.github.io` repository:

1. Create a folder named `windows-unattend-generator`.
2. Upload the contents of this package into that folder.
3. Commit and push the changes.
4. Open the configured address above after GitHub Pages finishes deploying.

If it is a separate repository named `windows-unattend-generator`, upload the files to the repository root and enable GitHub Pages for the correct branch.

## Sitemap and Google Search

The finished sitemap is included at:

`https://tdbnz-coding.github.io/windows-unattend-generator/sitemap.xml`

After publishing:

1. Add and verify `https://tdbnz-coding.github.io/` in Google Search Console.
2. Submit the sitemap URL shown above.
3. Inspect the generator's full URL and request indexing once.
4. Add this line to the `robots.txt` file at the root of `tdbnz-coding.github.io`:

   `Sitemap: https://tdbnz-coding.github.io/windows-unattend-generator/sitemap.xml`

The project includes a `robots.txt` copy for reference, but crawler rules only apply when `robots.txt` is served from the hostname root.

## Test before publishing

- Open `index.html` and generate several configurations.
- Confirm automatic disk mode cannot download until its erase warning is acknowledged.
- Test mobile and desktop layouts.
- Run the live page through Lighthouse, the W3C HTML validator and Google's Rich Results Test.
- Validate generated XML against the exact Windows image using Windows System Image Manager when possible.
- Perform a full installation in a disposable virtual machine before using an answer file on physical hardware.

## Important limitations

- Windows answer-file settings vary between images, editions and releases.
- The display language must exist in the installation media.
- Automatic disk mode is destructive and can erase the wrong disk if its number is incorrect.
- Passwords and product keys appear as readable text in the downloaded XML.
- Compatibility bypasses do not make unsupported hardware officially supported.

This is an independent utility and is not affiliated with or endorsed by Microsoft.
