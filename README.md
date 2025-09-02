# YOLO Label Generator

Professional web-based annotation tool for creating YOLO format datasets. Built with Next.js 14, TypeScript, and modern web technologies for fast, efficient, and offline-capable labeling.

![YOLO Label Generator](https://img.shields.io/badge/YOLO-Label%20Generator-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PWA](https://img.shields.io/badge/PWA-Enabled-green)

## 🚀 Features

### Core Functionality
- **Multi-format Image Support**: JPG, PNG, WebP, BMP
- **Drag & Drop Interface**: Easy file and folder uploads
- **Real-time Annotation**: Draw, select, move, and resize bounding boxes
- **Class Management**: Create, edit, reorder, and color-code object classes
- **YOLO Export**: Generate standard YOLO format annotations

### Advanced Features
- **Dataset Splitting**: Automatic train/validation/test splits
- **Keyboard Shortcuts**: Efficient workflow with hotkeys
- **Zoom & Pan**: Handle large images with smooth navigation
- **Auto-save**: Automatic local storage backup
- **PWA Support**: Works offline, installable as desktop app
- **Export Options**: Single images, classes.txt, data.yaml, full ZIP datasets

### User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Mode**: System preference detection
- **Accessibility**: ARIA labels, keyboard navigation, focus management
- **Performance**: Optimized for large images and datasets

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Canvas**: react-konva (Konva.js)
- **State Management**: Zustand + Immer
- **Forms**: react-hook-form + zod validation
- **Storage**: IndexedDB (via idb)
- **File Operations**: File System Access API + JSZip
- **PWA**: Service Worker + Web App Manifest

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/yolo-label-generator.git
   cd yolo-label-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Production Build

```bash
npm run build
npm start
```

### PWA Installation
The app can be installed as a Progressive Web App:
- Desktop: Look for install icon in address bar
- Mobile: Use "Add to Home Screen" from browser menu

## 🎯 Usage Guide

### Getting Started

1. **Create a New Project**
   - Click "New Project" on the home page
   - Enter a project name
   - Upload images via drag & drop or file picker

2. **Set Up Classes**
   - Add object classes in the left panel
   - Assign colors and reorder as needed
   - Classes are numbered 0, 1, 2... for YOLO format

3. **Annotate Images**
   - Use drawing tool to create bounding boxes
   - Select existing boxes to modify
   - Navigate between images using arrow keys

4. **Export Dataset**
   - Click Export button
   - Choose export type (single image, full dataset, etc.)
   - Configure train/val/test splits
   - Download ZIP file with YOLO format

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New bounding box (draw mode) |
| `Escape` | Select mode / clear selection |
| `Delete` / `Backspace` | Delete selected box |
| `Space` | Pan mode (hold) |
| `←` `→` | Navigate between images |
| `Z` `X` | Zoom in / out |
| `1-9` | Select class by number |
| `Ctrl+S` | Save project |

### Class Management

- **Add Class**: Click "+" button in Classes panel
- **Edit Class**: Click edit icon next to class name
- **Reorder Classes**: Drag classes to reorder (updates YOLO IDs)
- **Delete Class**: Click trash icon (removes all associated annotations)
- **Change Color**: Click color swatch to randomize

### Export Formats

#### Single Image
- Exports one `.txt` file for current image
- Format: `<class_id> <x_center> <y_center> <width> <height>`
- Values normalized to 0-1 range

#### Full Dataset ZIP
```
dataset/
├── images/
│   ├── train/     # Training images
│   ├── val/       # Validation images
│   └── test/      # Test images (optional)
├── labels/
│   ├── train/     # Training labels (.txt)
│   ├── val/       # Validation labels (.txt)
│   └── test/      # Test labels (.txt)
├── classes.txt    # Class names (one per line)
├── data.yaml      # YOLO configuration
└── README.md      # Dataset documentation
```

#### classes.txt Format
```
person
car
bicycle
dog
cat
```

#### data.yaml Format
```yaml
path: .
train: images/train
val: images/val
test: images/test

nc: 5
names:
  0: person
  1: car
  2: bicycle
  3: dog
  4: cat
```

## 🔧 Configuration

### Dataset Splits
Configure in Export dialog:
- **Train**: 60-80% (default: 70%)
- **Validation**: 15-25% (default: 20%)
- **Test**: 10-20% (default: 10%)

### Split Methods
- **Random**: Shuffles images before splitting
- **Sequential**: Maintains original order

### Export Options
- **Include data.yaml**: Generate YOLO config file
- **Train/Val/Test splits**: Customize percentages
- **Split method**: Random vs sequential

## 🏗️ Architecture

### Project Structure
```
yolo-label-generator/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Home page
│   └── labeler/page.tsx   # Main editor
├── components/            # React components
│   ├── CanvasStage.tsx    # Konva canvas with annotations
│   ├── ClassPanel.tsx     # Class management
│   ├── ImageStrip.tsx     # Image navigation
│   ├── Toolbar.tsx        # Tool controls
│   └── ExportDialog.tsx   # Export configuration
├── lib/                   # Core logic
│   ├── store.ts          # Zustand state management
│   ├── types.ts          # TypeScript definitions
│   ├── yolo.ts           # YOLO format utilities
│   ├── fs.ts             # File system operations
│   ├── idb.ts            # IndexedDB storage
│   ├── split.ts          # Dataset splitting
│   └── utils.ts          # Helper functions
├── public/               # Static assets
│   ├── manifest.json     # PWA manifest
│   └── sw.js            # Service worker
└── styles/              # Global styles
```

### State Management
Uses Zustand with Immer for immutable updates:
- **Project state**: Images, annotations, classes
- **UI state**: Tool mode, selection, viewport
- **Persistence**: Auto-save to IndexedDB

### Storage Strategy
- **Images**: Blob URLs in memory, metadata in IndexedDB
- **Annotations**: Full project data in IndexedDB
- **Export**: Client-side ZIP generation
- **Offline**: Service Worker caching

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests (if implemented)
```bash
npm run test:e2e
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Deploy automatically on push
3. PWA features work out of the box

### Static Export
```bash
npm run build
npm run export
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for formatting
- Write descriptive commit messages

### Adding Features
1. Update types in `lib/types.ts`
2. Add logic to appropriate `lib/` files
3. Create/update components
4. Add tests if applicable
5. Update documentation

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support & Troubleshooting

### 🐛 Common Issues

#### Images Not Loading in Canvas

**Symptoms:**
- Images uploaded successfully but canvas shows "Loading image..." or blank
- Console shows "Failed to load image" errors
- Image strip shows thumbnails but main canvas is empty

**Debugging Steps:**
1. **Open Browser Console (F12)** and look for:
   ```javascript
   // Common error messages:
   "Failed to load image: blob:..."
   "Cannot read properties of undefined (reading 'id')"
   "Image load error"
   ```

2. **Check Project State:**
   ```javascript
   // Run in console to check current state:
   console.log('Current project:', JSON.parse(localStorage.getItem('yolo-projects') || '[]'));
   ```

3. **Verify Image Upload:**
   - Check if images appear in image strip at bottom
   - Ensure currentImageId is set (check debug logs)
   - Confirm blob URLs are valid

**Solutions:**
- **Refresh page** and try again
- **Create project manually** first, then upload images
- **Clear browser storage**: Settings → Storage → Clear Data
- **Use supported formats**: JPG, PNG, WebP, BMP only
- **Check file size**: Large files (>50MB) might cause issues

#### Canvas Not Displaying

**Symptoms:**
- Canvas area shows "Loading canvas..." indefinitely
- Console shows Konva/Canvas related errors

**Solutions:**
- **Browser Compatibility**: Use Chrome 90+, Firefox 88+, Safari 14+
- **Disable Extensions**: Try incognito mode
- **Hardware Acceleration**: Enable in browser settings
- **Clear Cache**: Hard refresh (Ctrl+Shift+R)

#### Export Issues

**Symptoms:**
- Export button doesn't work
- Downloaded files are empty
- Browser blocks downloads

**Solutions:**
- **Allow Downloads**: Check browser download settings
- **Disable Pop-up Blocker**: For this site
- **Try Different Browser**: Some browsers have stricter download policies
- **Check Annotations**: Ensure you have labeled images to export

#### Performance Problems

**Symptoms:**
- Slow loading, laggy interface
- Browser becomes unresponsive
- Memory warnings

**Solutions:**
- **Optimize Images**: Resize before upload (max 2048px recommended)
- **Smaller Batches**: Work with 50-100 images max
- **Close Tabs**: Free up browser memory
- **Regular Exports**: Don't keep too much data in browser storage

### 🔧 Development Issues

#### Build Failures

```bash
# Clear everything and reinstall
rm -rf node_modules .next package-lock.json
npm install
npm run build

# Check Node.js version (requires 18+)
node --version
```

#### Type Errors

```bash
# Type check
npm run type-check

# Update types
npm install --save-dev @types/node @types/react @types/react-dom
```

### 📊 Debug Information

Add `?debug=true` to URL for enhanced logging:
```
http://localhost:3000?debug=true
http://localhost:3000/labeler?debug=true
```

### 🌐 Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Recommended |
| Firefox | 88+ | ✅ Supported |
| Safari | 14+ | ✅ Supported |
| Edge | 90+ | ✅ Supported |

### 📱 Device Support

- **Desktop**: Full feature support
- **Tablet**: Good support (touch interface)
- **Mobile**: Limited (small screen, touch precision)

### 🆘 Getting Help

Before reporting issues:

1. **Check Console**: Open F12 and look for errors
2. **Try Incognito**: Test in private browsing mode
3. **Minimal Test**: Try with 1-2 small images
4. **Different Browser**: Test in Chrome if using other browser

**Report Issues With:**
- Browser name and version
- Console error messages
- Steps to reproduce
- Sample images (if safe to share)

### 💡 Tips for Success

1. **Start Small**: Test with a few images first
2. **Regular Exports**: Save your work frequently
3. **Consistent Naming**: Use clear, consistent class names
4. **Quality Control**: Review annotations before export
5. **Backup Projects**: Export project files as backup

---
3. Try incognito/private mode
4. Update browser to latest version

## 🔮 Roadmap

### Short Term
- [ ] Undo/Redo functionality
- [ ] Batch operations (delete multiple, change class)
- [ ] Import existing YOLO datasets
- [ ] Copy/paste annotations between images

### Medium Term
- [ ] Collaboration features (multi-user)
- [ ] Cloud storage integration
- [ ] Advanced export formats (COCO, Pascal VOC)
- [ ] Automated QA checks

### Long Term
- [ ] AI-assisted annotation
- [ ] Video annotation support
- [ ] Plugin system
- [ ] Advanced analytics dashboard

## 📊 Performance Tips

### For Large Datasets
- Process images in batches
- Use image preprocessing to reduce file sizes
- Export frequently to avoid browser memory limits
- Consider splitting very large projects

### For Large Images
- Optimize images before upload (reduce resolution if possible)
- Use zoom controls instead of viewing full resolution
- Close unused browser tabs
- Monitor browser memory usage

## 🏷️ YOLO Training Integration

### With YOLOv8
```bash
pip install ultralytics
yolo train data=data.yaml model=yolov8n.pt epochs=100
```

### With YOLOv5
```bash
git clone https://github.com/ultralytics/yolov5
cd yolov5
pip install -r requirements.txt
python train.py --data data.yaml --weights yolov5s.pt --epochs 100
```

### With Custom Training
The exported format is compatible with most YOLO implementations. Adjust paths in `data.yaml` as needed for your training environment.

---

**Made with ❤️ for the computer vision community**

For questions, suggestions, or contributions, please open an issue or pull request on GitHub.
