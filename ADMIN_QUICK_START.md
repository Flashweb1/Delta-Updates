# Admin Dashboard - Quick Start Guide

## 🚀 Getting Started

### Access the Dashboard
```
http://localhost:3000/admin
```

### Default Login
```
Email: dev@deltaupdates.test (dev mode - no auth required)
Password: (any value)
```

**Note**: Dev mode bypass is gated to dev builds in `src/contexts/AuthContext.tsx` — it can never take effect in production.

---

## 📍 Navigation

### Sidebar Sections

#### MAIN
- **Dashboard** - Overview with KPIs and analytics
- **Articles** - Manage all articles
- **Media** - Upload and manage images
- **Comments** - Review and moderate comments

#### ANALYTICS
- **Overview** - General analytics dashboard
- **Traffic** - Visitor traffic patterns
- **Engagement** - User engagement metrics
- **Sources** - Traffic sources

#### MANAGEMENT
- **Users** - Editor and user accounts
- **Categories** - Article categories
- **Settings** - General settings

#### QUICK ACTIONS
- **New Article** - Create new article
- **View Site** - Go to public site

---

## 🎯 Dashboard Overview

### Greeting Section
- Shows time-based greeting ("Good morning/afternoon/evening")
- Displays current date
- "New Article" button for quick access

### KPI Cards
Shows 4 key metrics:
1. **Total Articles** - All articles in system
2. **Published** - Live articles
3. **Drafts** - Articles in draft
4. **In Review** - Articles pending approval

Each card shows trend percentage (up/down arrow)

### Analytics
- **Content Performance** - 7-day view/engagement trend
- **Publishing Overview** - Distribution of article statuses (donut chart)

### Recent Articles Table
- Shows latest 5 articles
- Click article to edit
- See status, category, author, view count
- Date of publication

### Recent Activity
- Timeline of recent editorial actions
- Color-coded by activity type
- Shows time elapsed

### Top Performing Stories
- Ranked list 1-5
- View counts for each article

---

## 🔍 Search & Filter

### Global Search
```
Press Ctrl+K (or Cmd+K on Mac)
or click search icon in header
```

Types of search:
- Article titles
- Comments
- Users
- Categories

---

## 🎨 Customization

### Colors
Edit `src/styles/admin-premium.css` line 10-20:

```css
--color-red-brand: #E32626;      /* Primary red */
--color-gold-warm: #F2A900;      /* Secondary gold */
--color-navy-deep: #07152E;      /* Sidebar navy */
```

### Logo
Update Bijlinks logo in `src/components/admin/AdminSidebar.tsx`:

```typescript
<div className="sidebar-logo-icon">B</div>  {/* Change B to your icon */}
```

### Branding Text
Edit sidebar branding:

```typescript
<div className="sidebar-logo-text-main">Bijlinks</div>
<div className="sidebar-logo-text-sub">Newsroom</div>
```

---

## 📱 Responsive Behavior

### Desktop (1440px+)
- Full sidebar always visible
- All content visible at once
- Optimal viewing experience

### Tablet (1024px)
- Sidebar remains visible
- Content adapts to available space
- Cards may stack

### Mobile (< 768px)
- Sidebar collapses (swipe to open)
- Content becomes full width
- Tables convert to cards

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + K | Global search |
| Escape | Close search/modals |
| Tab | Navigate between elements |
| Enter | Submit forms/click buttons |

---

## 🔐 User Profile

### Profile Menu
Click user avatar (E) in top-right corner:

- View profile
- Settings
- Help
- Sign out

---

## 🚨 Notifications

### Notification Bell
Red dot appears when:
- New comments awaiting review
- Articles in review status
- System alerts

Click bell to see details.

---

## 📊 Using the Charts

### Content Performance
- Red line = Views
- Gold line = Engagement
- Hover to see values
- "Last 7 days" dropdown to change period

### Publishing Overview
- Shows distribution of articles by status
- Red = Published
- Gold = Drafts
- Blue = In Review
- Click segments for details (when implemented)

---

## 📝 Creating New Articles

### Quick Create
1. Click **"New Article"** button (top-right)
2. Fill in article details
3. Choose category
4. Add content
5. Select status (Draft/Review/Published)
6. Click Save

### From Articles Page
1. Go to **Articles** in sidebar
2. Click **"New Article"** button
3. Follow form

---

## ✏️ Editing Articles

### From Dashboard
1. Find article in "Recent Articles" table
2. Click edit icon (pencil)
3. Make changes
4. Save

### From Articles Page
1. Go to **Articles** in sidebar
2. Find article in list
3. Click to open/edit
4. Save changes

---

## 🗑️ Deleting Content

### Delete Article
1. Open article
2. Click delete button
3. Confirm deletion
4. Article removed

**Note**: Deleted articles cannot be recovered.

---

## 👥 Managing Users

### View Users
1. Go to **Management → Users**
2. See all editors/staff
3. View permissions, status

### Add New User
1. Click **"New User"** button
2. Enter email
3. Set permissions
4. Send invitation
5. User creates password on login

---

## ⚙️ Settings

### General Settings
- Site title
- Site description
- Social media links
- Contact email

### Editorial Settings
- Default article status
- Require review before publishing
- Featured article limit

### User Settings
- Notification preferences
- Display preferences
- API access

---

## 🎓 Tips & Tricks

### Dashboard Tips
- ✅ Check dashboard first thing in morning
- ✅ Look at trends to understand performance
- ✅ Review comments regularly
- ✅ Monitor articles in review status

### Writing Tips
- ✅ Save as draft while writing
- ✅ Use descriptive titles
- ✅ Choose correct category
- ✅ Add featured image
- ✅ Request review before publishing

### Organization Tips
- ✅ Use consistent categories
- ✅ Tag related articles
- ✅ Archive old articles
- ✅ Regular backups
- ✅ Review user permissions

---

## 🆘 Troubleshooting

### Can't login
- ✅ Check email is correct
- ✅ Reset password
- ✅ Clear browser cache
- ✅ Try different browser

### Dashboard not loading
- ✅ Refresh page
- ✅ Check internet connection
- ✅ Clear cache
- ✅ Check browser console for errors

### Buttons not responding
- ✅ Check if page is still loading
- ✅ Try again
- ✅ Refresh page
- ✅ Check network connection

### Styling looks broken
- ✅ Hard refresh (Cmd/Ctrl + Shift + R)
- ✅ Clear browser cache
- ✅ Check browser support
- ✅ Try different browser

---

## 📞 Support

### Resources
- Check documentation in ADMIN_REDESIGN_SUMMARY.md
- See architecture in ADMIN_ARCHITECTURE.md
- Review test checklist in ADMIN_DASHBOARD_TEST.md

### Contact
For issues or questions:
- Create issue on GitHub
- Contact development team
- Check project documentation

---

## ✅ Best Practices

### Content Management
1. **Draft First** - Always save as draft initially
2. **Review Before Publishing** - Have another editor review
3. **Consistent Naming** - Use consistent article naming
4. **Tag Well** - Use proper categories and tags
5. **Add Metadata** - Include proper descriptions

### Security
1. **Change Password** - Regularly update password
2. **Logout** - Always logout when done
3. **Permissions** - Only grant necessary permissions
4. **Backup** - Regular backups of content
5. **Updates** - Keep system updated

### Performance
1. **Optimize Images** - Compress before upload
2. **Avoid Duplicates** - Don't create duplicate articles
3. **Archive Old Content** - Archive articles after expiry
4. **Clean Comments** - Remove spam/moderation items
5. **Monitor Metrics** - Check KPIs regularly

---

## 🎉 You're All Set!

The Bijlinks Newsroom Admin Dashboard is ready to use. Enjoy the premium, modern editorial experience!

**Questions?** See full documentation in project docs or contact development team.

---

**Last Updated**: September 1, 2026
**Version**: 1.0 - Production Ready
