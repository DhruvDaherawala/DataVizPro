# Converting Documentation to PDF

If you want to convert the project documentation to PDF format, follow these steps:

## Prerequisites

You'll need Node.js installed on your system.

## Steps

1. Install the required dependency:

```bash
npm install markdown-pdf
```

2. Run the conversion script:

```bash
node documentation-guide.js
```

3. The PDF will be generated and saved as `DataVizPro_Documentation.pdf` in the project root directory.

## Troubleshooting

If you encounter any issues:

- Make sure the `DOCUMENTATION.md` file exists in the project root
- Ensure you have proper write permissions in the directory
- Check that you have installed the markdown-pdf dependency correctly

## Manual Alternative

If you prefer to convert the markdown to PDF manually, you can:

1. Use an online converter like [MD2PDF](https://md2pdf.netlify.app/)
2. Use a markdown editor that supports PDF export, such as Typora
3. Copy the content to a Google Doc or Microsoft Word document and export as PDF 