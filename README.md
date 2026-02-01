# Urban Hub Website

A modern, responsive website for Urban Hub - premium student accommodation in Preston, UK. Built with React, TypeScript, Vite, and Supabase.

## 🌟 Features

### Public Pages
- **Homepage** - Dynamic studio listings with academic year routing
- **About** - Information about Urban Hub and facilities
- **Studios** - Browse and view studio accommodation options
- **Blog** - News and updates with SEO optimization
- **Reviews** - Student testimonials and reviews
- **FAQ** - Frequently asked questions
- **Contact** - Contact form with lead management
- **Short Term** - Short-term accommodation options
- **Privacy & Terms** - Legal pages

### Admin Dashboard
- **Blog Management** - Create, edit, and manage blog posts
- **SEO Management** - Configure SEO settings for all pages
- **Analytics Management** - Track website analytics and events
- **Content Management** - Manage amenities, FAQs, reviews, and why-us cards
- **Media Library** - Upload and manage images
- **Form Submissions** - View contact form and lead submissions
- **Newsletter Management** - Manage newsletter subscribers

### Key Features
- 🎨 Modern UI with Tailwind CSS and Radix UI components
- 📱 Fully responsive design
- 🔍 SEO optimized with dynamic meta tags
- 📊 Analytics tracking integration
- 🎭 Smooth animations with Framer Motion and GSAP
- 🔐 Admin authentication with Supabase
- 📝 Rich text editor for blog posts
- 🖼️ Image upload and management
- 📧 Newsletter popup and management
- 💬 WhatsApp integration
- ⚡ Fast performance with Vite

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/IansiryaKatana/URBANHUB.git
cd URBANHUB
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_PORTAL_URL=https://portal.urbanhub.uk
```

4. Run database migrations:
   - Navigate to your Supabase dashboard
   - Run the SQL files in `supabase/migrations/` in order

5. Start the development server:
```bash
npm run dev
```

The website will be available at `http://localhost:5173`

## 📦 Build

To build for production:

```bash
npm run build
```

The production build will be in the `dist` directory.

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animations
- **GSAP** - Advanced animations
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **TanStack Query** - Data fetching and caching

### Backend & Services
- **Supabase** - Backend as a service (database, auth, storage)
- **Stripe** - Payment processing (integrated)

### Additional Libraries
- **Embla Carousel** - Image carousels
- **React Quill** - Rich text editor
- **Recharts** - Data visualization
- **jsPDF** - PDF generation
- **date-fns** - Date utilities
- **Lucide React** - Icons

## 📁 Project Structure

```
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── admin/      # Admin-specific components
│   │   ├── animations/ # Animation components
│   │   ├── contact/    # Contact form components
│   │   ├── leads/      # Lead management components
│   │   ├── reviews/    # Review components
│   │   └── ui/         # UI primitives (Radix UI)
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # Third-party integrations
│   │   └── supabase/   # Supabase client and types
│   ├── lib/            # Utility functions
│   ├── pages/          # Page components
│   │   └── admin/      # Admin dashboard pages
│   └── utils/          # Helper utilities
├── supabase/
│   └── migrations/    # Database migration files
└── dist/               # Production build output
```

## 🔧 Configuration

### Environment Variables

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key
- `VITE_PORTAL_URL` - Booking portal URL (default: https://portal.urbanhub.uk)

### Supabase Setup

1. Create a new Supabase project
2. Run migrations in order from `supabase/migrations/`
3. Set up storage buckets for images
4. Configure Row Level Security (RLS) policies
5. Set up authentication providers if needed

## 🚢 Deployment

### Netlify

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy!

See `NETLIFY_DEPLOY.md` for detailed deployment instructions.

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎨 Styling

The project uses Tailwind CSS with custom configuration. Component styles are in:
- `tailwind.config.ts` - Tailwind configuration
- `src/index.css` - Global styles
- Component-level Tailwind classes

## 🔐 Admin Access

Admin routes are protected and require authentication. Access the admin dashboard at `/admin/login`.

## 📄 License

This project is private and proprietary.

## 👨‍💻 Author

**IanKatana**
- GitHub: [@IansiryaKatana](https://github.com/IansiryaKatana)

## 🙏 Acknowledgments

- Built with modern web technologies
- Uses free and open-source libraries for cost-effective production
- Designed for optimal user experience and performance

---

For more information, visit [Urban Hub](https://urbanhub.uk)
