document.addEventListener('DOMContentLoaded', () => {
    
    /* ======================================================================
       1. UI & Tab Navigation
       ====================================================================== */
    const tabs = document.querySelectorAll('.tab-btn');
    const views = document.querySelectorAll('.view-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active state from all tabs and hide views
            tabs.forEach(t => {
                t.classList.remove('active');
                t.classList.add('opacity-70', 'hover:opacity-100');
            });
            views.forEach(v => {
                v.classList.remove('block');
                v.classList.add('hidden');
            });

            // Set active tab and show view
            tab.classList.add('active');
            tab.classList.remove('opacity-70', 'hover:opacity-100');
            const targetId = tab.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');
            document.getElementById(targetId).classList.add('block');
        });
    });

    /* ======================================================================
       2. Feature: Image to PDF
       ====================================================================== */
    const imgDropZone = document.getElementById('img-drop-zone');
    const imgInput = document.getElementById('img-input');
    const imgPreviewContainer = document.getElementById('img-preview-container');
    const imgActions = document.getElementById('img-actions');
    const btnGenerateImgPdf = document.getElementById('btn-generate-img-pdf');
    
    let imageFiles = []; // Array of objects: { id, file, dataUrl }

    // Initialize SortableJS on the preview container
    new Sortable(imgPreviewContainer, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: () => {
            // Update imageFiles array based on new DOM order
            const newOrder = [];
            imgPreviewContainer.querySelectorAll('.img-card').forEach(card => {
                const id = card.getAttribute('data-id');
                const fileObj = imageFiles.find(f => f.id === id);
                if(fileObj) newOrder.push(fileObj);
            });
            imageFiles = newOrder;
        }
    });

    const handleImageFiles = (files) => {
        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) return;

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const id = 'img_' + Math.random().toString(36).substr(2, 9);
                imageFiles.push({ id, file, dataUrl: e.target.result });
                renderImagePreviews();
            };
            reader.readAsDataURL(file);
        });
    };

    const renderImagePreviews = () => {
        imgPreviewContainer.innerHTML = '';
        imageFiles.forEach(item => {
            const card = document.createElement('div');
            card.className = 'img-card';
            card.setAttribute('data-id', item.id);
            card.innerHTML = `
                <img src="${item.dataUrl}" alt="Preview">
                <button class="remove-btn" onclick="removeImage('${item.id}')">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            `;
            imgPreviewContainer.appendChild(card);
        });

        if (imageFiles.length > 0) {
            imgActions.classList.remove('hidden');
        } else {
            imgActions.classList.add('hidden');
        }
    };

    window.removeImage = (id) => {
        imageFiles = imageFiles.filter(item => item.id !== id);
        renderImagePreviews();
    };

    imgDropZone.addEventListener('click', () => imgInput.click());
    imgInput.addEventListener('change', (e) => handleImageFiles(e.target.files));
    
    imgDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imgDropZone.classList.add('border-primary', 'bg-slate-800/50');
    });
    imgDropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        imgDropZone.classList.remove('border-primary', 'bg-slate-800/50');
    });
    imgDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        imgDropZone.classList.remove('border-primary', 'bg-slate-800/50');
        handleImageFiles(e.dataTransfer.files);
    });

    btnGenerateImgPdf.addEventListener('click', async () => {
        if (imageFiles.length === 0) return;
        
        try {
            const btnSpan = btnGenerateImgPdf.querySelector('span');
            const originalText = btnSpan.textContent;
            btnSpan.textContent = 'Generating...';
            btnGenerateImgPdf.disabled = true;

            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.create();

            for (const item of imageFiles) {
                const imgBytes = await item.file.arrayBuffer();
                let pdfImage;
                
                // Determine image type
                if (item.file.type === 'image/jpeg' || item.file.type === 'image/jpg') {
                    pdfImage = await pdfDoc.embedJpg(imgBytes);
                } else if (item.file.type === 'image/png') {
                    pdfImage = await pdfDoc.embedPng(imgBytes);
                } else {
                    // Fallback or warning for unsupported types in pdf-lib (like webp without conversion)
                    console.warn('Unsupported image type for direct embed:', item.file.type);
                    continue;
                }

                const { width, height } = pdfImage.scale(1);
                const page = pdfDoc.addPage([width, height]);
                page.drawImage(pdfImage, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Merged_Images.pdf';
            a.click();
            URL.revokeObjectURL(url);

            btnSpan.textContent = originalText;
            btnGenerateImgPdf.disabled = false;
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("An error occurred while generating the PDF.");
            btnGenerateImgPdf.querySelector('span').textContent = 'Convert to Single PDF';
            btnGenerateImgPdf.disabled = false;
        }
    });

    /* ======================================================================
       3. Feature: Text to PDF
       ====================================================================== */
    // Initialize Quill editor
    const quill = new Quill('#quill-editor', {
        theme: 'snow',
        placeholder: 'Compose an epic document...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['clean']
            ]
        }
    });

    const btnGenerateTextPdf = document.getElementById('btn-generate-text-pdf');
    btnGenerateTextPdf.addEventListener('click', () => {
        const content = document.querySelector('.ql-editor');
        if (!content || content.innerText.trim() === '') {
            alert("Please enter some text before exporting.");
            return;
        }

        const opt = {
            margin:       1,
            filename:     'Document.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Temporarily change background to white for export if needed, 
        // but quill-editor is already styled white.
        html2pdf().set(opt).from(content).save();
    });

    /* ======================================================================
       4. Feature: Extract PDF
       ====================================================================== */
    const pdfDropZone = document.getElementById('pdf-drop-zone');
    const pdfInput = document.getElementById('pdf-input');
    const pdfFileInfo = document.getElementById('pdf-file-info');
    const pdfFilename = document.getElementById('pdf-filename');
    const pdfPageCount = document.getElementById('pdf-pagecount');
    const pageSelectionArea = document.getElementById('page-selection-area');
    const pdfActions = document.getElementById('pdf-actions');
    const btnExtractPdf = document.getElementById('btn-extract-pdf');
    const pageRangesInput = document.getElementById('page-ranges');
    const pageSelectionError = document.getElementById('page-selection-error');

    let loadedPdfDoc = null;
    let loadedPdfName = '';
    let totalPages = 0;

    const handlePdfFile = async (file) => {
        if (file.type !== 'application/pdf') {
            alert("Please upload a valid PDF file.");
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const { PDFDocument } = PDFLib;
            loadedPdfDoc = await PDFDocument.load(arrayBuffer);
            totalPages = loadedPdfDoc.getPageCount();
            loadedPdfName = file.name;

            // Update UI
            pdfFilename.textContent = loadedPdfName;
            pdfPageCount.textContent = `${totalPages} page(s)`;
            pdfFileInfo.classList.remove('hidden');
            pageSelectionArea.classList.remove('hidden');
            pdfActions.classList.remove('hidden');
            
            // Hide drop zone text for cleaner look
            pdfDropZone.querySelector('div').classList.add('hidden');
            pdfDropZone.classList.replace('p-8', 'p-4');

        } catch (error) {
            console.error("Error loading PDF:", error);
            alert("Could not read the PDF file. It might be encrypted or corrupted.");
        }
    };

    pdfDropZone.addEventListener('click', () => pdfInput.click());
    pdfInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) handlePdfFile(e.target.files[0]);
    });
    
    pdfDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        pdfDropZone.classList.add('border-pink-500', 'bg-slate-800/50');
    });
    pdfDropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        pdfDropZone.classList.remove('border-pink-500', 'bg-slate-800/50');
    });
    pdfDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        pdfDropZone.classList.remove('border-pink-500', 'bg-slate-800/50');
        if(e.dataTransfer.files.length > 0) handlePdfFile(e.dataTransfer.files[0]);
    });

    const parsePageRanges = (input, maxPages) => {
        const pages = new Set();
        const parts = input.split(',').map(p => p.trim()).filter(p => p);
        
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (isNaN(start) || isNaN(end) || start < 1 || end > maxPages || start > end) {
                    throw new Error(`Invalid range: ${part}`);
                }
                for (let i = start; i <= end; i++) {
                    pages.add(i);
                }
            } else {
                const num = Number(part);
                if (isNaN(num) || num < 1 || num > maxPages) {
                    throw new Error(`Invalid page number: ${part}`);
                }
                pages.add(num);
            }
        }
        
        return Array.from(pages).sort((a, b) => a - b);
    };

    btnExtractPdf.addEventListener('click', async () => {
        if (!loadedPdfDoc) return;
        
        pageSelectionError.classList.add('hidden');
        const rawInput = pageRangesInput.value;
        
        if (!rawInput) {
            pageSelectionError.textContent = "Please enter page numbers to extract.";
            pageSelectionError.classList.remove('hidden');
            return;
        }

        let selectedPages = [];
        try {
            selectedPages = parsePageRanges(rawInput, totalPages);
            if (selectedPages.length === 0) throw new Error("No valid pages selected.");
        } catch (error) {
            pageSelectionError.textContent = error.message;
            pageSelectionError.classList.remove('hidden');
            return;
        }

        try {
            const btnSpan = btnExtractPdf.querySelector('span');
            const originalText = btnSpan.textContent;
            btnSpan.textContent = 'Extracting...';
            btnExtractPdf.disabled = true;

            const { PDFDocument } = PDFLib;
            const newPdfDoc = await PDFDocument.create();

            // pdf-lib page indices are 0-based, our input is 1-based
            const indicesToExtract = selectedPages.map(p => p - 1);
            
            const copiedPages = await newPdfDoc.copyPages(loadedPdfDoc, indicesToExtract);
            
            copiedPages.forEach(page => {
                newPdfDoc.addPage(page);
            });

            const pdfBytes = await newPdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `Extracted_${loadedPdfName}`;
            a.click();
            URL.revokeObjectURL(url);

            btnSpan.textContent = originalText;
            btnExtractPdf.disabled = false;

        } catch (error) {
            console.error("Error extracting PDF pages:", error);
            alert("An error occurred while extracting pages.");
            btnExtractPdf.querySelector('span').textContent = 'Extract to New PDF';
            btnExtractPdf.disabled = false;
        }
    });

});
