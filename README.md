# 🎯 Goal Management Application

A comprehensive goal and task management application built with Next.js, Prisma, and SQLite with advanced timeline visualization and virtualized task lists.

## 🚀 Quick Start for Remote Developers

Get the application running from scratch in under 5 minutes:

### Prerequisites
- Node.js (v18 or higher)
- NPM (comes with Node.js)

### Step-by-Step Setup

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Clear Browser Data (Important!)
Before starting, clear any existing IndexedDB/voice data:

**Option A: Automated (if Playwright is available)**
```bash
npm run clear-browser-data
```

**Option B: Manual Browser Cleanup**
1. Open browser and go to `http://localhost:3000` (after starting the server)
2. Open Developer Tools (F12)
3. Go to Console tab and paste this code:
```javascript
// Clear all IndexedDB and storage
async function clearAll() {
  const dbs = ['captainsLogDatabase', 'nexvolvDatabase', 'tagBasedDatabase'];
  for (const db of dbs) {
    indexedDB.deleteDatabase(db);
  }
  localStorage.clear();
  sessionStorage.clear();
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
  }
  console.log('✅ Cleanup complete! Refresh the page.');
}
clearAll();
```

#### 3. Setup Database with Sample Data
```bash
npm run fresh-start
```

This command will:
- Clean any existing database
- Generate Prisma client
- Create database schema
- Seed with comprehensive sample data (8 categories, 28 goals, 58 tasks, 40 reminders)
- Start the development server

#### 4. Access the Application
- **URL**: http://localhost:3000
- **Test User**: test@example.com
- **Password**: password123

## 🛠️ Available Commands

### Database Management
| Command | Description |
|---------|-------------|
| `npm run db:clean` | Remove all database files |
| `npm run db:setup` | Generate client + create schema + seed |
| `npm run db:reset` | Complete database reset (clean + setup) |
| `npm run db:seed` | Comprehensive seed with robust interconnected data |
| `npm run db:verify` | Verify database setup and show contents |

### Development
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |

### Quick Actions
| Command | Description |
|---------|-------------|
| `npm run fresh-start` | Complete reset + start dev server |
| `npm run setup` | Alias for `db:reset` |
| `npm run clear-browser-data` | Clear IndexedDB/browser storage |

### Whisper Development
| Command | Description |
|---------|-------------|
| `npm run whisper:install` | Install whisper.cpp dependencies |
| `npm run whisper:test` | Test whisper backends |
| `npm run whisper:benchmark` | Benchmark whisper performance |
| `npm run whisper:install-deps` | Install Python whisper dependencies |

## 📊 Comprehensive Sample Data (5X Enhanced)

The seed creates realistic, interconnected data for thorough testing:

### Core Data
- **1 Test User** (test@example.com / password123)
- **8 Categories** (WORK, PERSONAL, HEALTH, WEALTH, FAMILY, HOBBIES, HOME, TRAVEL)
- **28 Goals** with varied progress (15%-100%), some archived, different timeframes
- **58 Tasks** with all priority levels, statuses, some overdue, some completed
- **40 Reminders** including daily, weekly, monthly, one-time, some overdue

### Data Variety & Testing Scenarios
- **All Priority Levels**: HIGH (urgent), MEDIUM (important), LOW (nice-to-have)
- **All Task Statuses**: TODO, IN_PROGRESS, COMPLETED
- **Date Variety**: Overdue, due today, future dates for edge case testing
- **Completion States**: Mix of completed and active items for historical data
- **Recurring Patterns**: Daily, weekly, monthly, yearly reminders
- **Goal Progress**: 15% to 100% completion for progress tracking tests
- **Archived Items**: Some goals marked as archived for archive functionality testing

### Data Interconnections
- **100% Task Linking**: All tasks properly linked to goals/subgoals (no orphaned tasks)
- **Category Organization**: Reminders and goals organized by categories
- **Hierarchical Structure**: User → Categories → Goals → Sub-goals → Tasks
- **Realistic Relationships**: Tasks span multiple categories and goal types
- **Edge Cases**: Overdue items, completed goals, recurring vs one-time events

## 🏗️ Project Structure

```
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── dev.db                 # SQLite database (auto-generated)
│   └── seed.js                # Comprehensive seed script with 5X robust data
├── scripts/
│   ├── clean-database.js      # Database cleanup
│   ├── clear-indexeddb.js     # IndexedDB cleanup (Playwright)
│   ├── clear-browser-data.js  # Manual cleanup instructions
│   ├── verify-setup.js        # Database verification
│   └── whisper/               # Whisper development scripts
│       ├── install-whisper-*.js  # Whisper installation utilities
│       ├── test-whisper-*.js     # Whisper testing and benchmarking
│       └── quick-test.js         # Quick whisper setup verification
├── src/
│   ├── app/                   # Next.js app router
│   ├── components/            # React components
│   ├── actions/               # Server actions
│   ├── lib/                   # Utilities and configurations
│   └── types/                 # TypeScript type definitions
└── package.json               # Dependencies and scripts
```

## 🔧 Development Workflow

### Daily Development
```bash
npm run dev
```

### When Database Issues Occur
```bash
npm run db:reset
```

### To Start Fresh
```bash
npm run fresh-start
```

### To Verify Everything Works
```bash
npm run db:verify
```

## 🧪 Testing

### Standard Tests
```bash
npm test                    # Run test suite
npm run test:performance    # Run performance tests
```

### Timeline & Performance Testing
Visit these test pages after starting the dev server:
- `/timeline-test` - Basic timeline functionality testing
- `/timeline-performance` - Performance testing with various configurations
- `/timeline-stress-test` - Stress testing with large datasets (1000+ items)

### Testing Scenarios Covered
- **Edge Cases**: Overdue tasks, completed items, recurring events
- **Performance**: Large datasets, rapid scrolling, memory usage
- **Accessibility**: Keyboard navigation, screen reader compatibility
- **Error Handling**: Network failures, data corruption, component errors
- **Data Relationships**: Complex goal/task hierarchies, category organization

## 🐛 Troubleshooting

### Database Issues
If you encounter database-related errors:
```bash
npm run db:clean
npm run db:setup
```

### Prisma Client Issues
If Prisma client is out of sync:
```bash
npx prisma generate
npm run db:reset
```

### Browser Storage Issues
If you see old data or strange behavior:
1. Run browser cleanup (see Step 2 above)
2. Hard refresh the page (Ctrl+Shift+R)
3. Restart the development server

### Complete Reset
For a completely fresh start:
```bash
npm run db:clean
rm -rf node_modules
npm install
npm run fresh-start
```

## 📝 Key Features

### Core Functionality
- **Goal Management**: Create, edit, archive goals with categories and sub-goals
- **Task Management**: Tasks linked to goals with priorities and statuses
- **Reminders**: One-time and recurring reminders with flexible scheduling
- **Categories**: Organize goals and reminders by category (WORK, HEALTH, etc.)
- **Progress Tracking**: Visual progress indicators and completion tracking
- **Responsive Design**: Works on desktop and mobile

### Advanced Features
- **Timeline Visualization**: Performant timeline with chunking and lazy loading
- **Virtualized Task Lists**: Smooth scrolling for large task lists (1000+ items)
- **Saved Filters**: Create and manage custom filters for tasks and goals
- **Performance Optimizations**: Memory optimization, caching, and windowing
- **Accessibility**: Full keyboard navigation and screen reader support
- **Error Boundaries**: Robust error handling with graceful fallbacks

### Performance Features
- **Windowing**: Only renders visible items for large datasets
- **Chunking**: Groups timeline items by date for efficient rendering
- **Memory Optimization**: Lightweight proxies for off-screen items
- **Caching**: Intelligent caching of calculations and measurements
- **Lazy Loading**: Progressive loading as user scrolls

## 🔐 Authentication

Currently uses a placeholder authentication system:
- **User ID**: `user_placeholder`
- **Email**: test@example.com
- **Password**: password123

## 🚀 Deployment

Build for production:
```bash
npm run build
npm run start
```

## 🏗️ Technical Architecture

### Core Technologies
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Backend**: Next.js API routes, Server Actions
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS with custom components
- **State Management**: Zustand for client state
- **Virtualization**: react-window for performance

### Performance Libraries
- **react-window**: Virtualization for large lists
- **@types/react-window**: TypeScript support
- **Custom utilities**: Timeline chunking, memory optimization, caching

### Key Components
- **Timeline System**: Chunked, virtualized timeline with lazy loading
- **Task Virtualization**: Smooth scrolling for 1000+ tasks
- **Saved Filters**: Backend infrastructure for custom filters
- **Error Boundaries**: Comprehensive error handling
- **Accessibility**: Full keyboard and screen reader support

## 🧹 Clean Slate Features

### Zero Legacy Code
- ✅ **No Habit References**: Completely removed from codebase
- ✅ **Clean Database**: Fresh schema with no legacy tables
- ✅ **Updated Types**: All TypeScript definitions current
- ✅ **Modern Patterns**: Latest React and Next.js best practices

### Browser Data Cleanup
- ✅ **IndexedDB Cleanup**: Automated and manual options
- ✅ **Voice Data Removal**: Clear transcription cache
- ✅ **Storage Reset**: localStorage, sessionStorage, cache cleanup
- ✅ **Fresh Start**: Complete browser state reset

### Development Experience
- ✅ **One Command Setup**: `npm run fresh-start` does everything
- ✅ **Comprehensive Seed**: 5X more data than basic setup
- ✅ **Error Handling**: Robust database reset and recovery
- ✅ **Clear Documentation**: Step-by-step instructions

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Window Documentation](https://react-window.vercel.app/)

## 🤝 Contributing

1. Follow the setup instructions above
2. Create a feature branch
3. Make your changes
4. Test thoroughly with provided test pages
5. Ensure performance benchmarks are maintained
6. Submit a pull request

## 🎯 Ready for Production

This application is optimized for:
- **Remote Development**: Complete setup in under 5 minutes
- **Performance Testing**: Built-in stress testing capabilities
- **Scalability**: Handles 1000+ items smoothly
- **Accessibility**: Full compliance with web standards
- **Error Recovery**: Graceful handling of edge cases

---

**Need Help?** Check the troubleshooting section or run `npm run db:verify` to check your setup.
