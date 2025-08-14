# Lead Card Design Wireframe

## Current Information to Display:
- Name
- Phone
- Interest (Dealership, etc.)
- Address
- Query/Message
- Submission Time
- Action Buttons (Copy, Mark as Read)

## Proposed Compact Layout:

```
┌─────────────────────────────────────────────────────┐
│  ┌──┐   Name                    • Time      [📋] [✓] │
│  │KT│   📞 +91 9991234567                           │
│  └──┘   🏢 Dealership | 📍 Yamuna                   │
│         💬 "Query text here..."                      │
└─────────────────────────────────────────────────────┘
```

## Option 1: Two-Line Compact (RECOMMENDED)
```
┌─────────────────────────────────────────────────────┐
│  [KT]  Kunal Test              • Today 2:24 PM  [📋][✓]│
│        📞 +919991234567  📍 Yamuna                   │
│        💼 Dealership                                 │
│        💬 "I am testing this to see how..."         │
└─────────────────────────────────────────────────────┘
```

## Option 2: Single Line Info
```
┌─────────────────────────────────────────────────────┐
│  [KT]  Kunal Test • Today 2:24 PM           [📋][✓] │
│        📞 +919991234567 | 💼 Dealership | 📍 Yamuna │
│        ───────────────────────────────────────────── │
│        "I am testing this to see how it looks..."   │
└─────────────────────────────────────────────────────┘
```

## Option 3: Grid Layout (Most Compact)
```
┌─────────────────────────────────────────────────────┐
│ [KT] Kunal Test                              [📋][✓] │
│      • Today 2:24 PM                                 │
│ ┌───────────────────┬──────────────────────┐       │
│ │ 📞 +919991234567  │ 💼 Dealership        │       │
│ │ 📍 Yamuna         │                       │       │
│ └───────────────────┴──────────────────────┘       │
│ 💬 "I am testing this to see how it looks..."       │
└─────────────────────────────────────────────────────┘
```

## Option 4: Minimalist (Current + Address)
```
┌─────────────────────────────────────────────────────┐
│  [K]   Karan                    [📋] [✓]            │
│        • Today 3:44 PM                               │
│                                                       │
│        📞 +911234561234                              │
│        🏢 Dealership · 📍 Yamuna                     │
│        ┌─────────────────────────────────┐          │
│        │ Testing it twice to see how...  │          │
│        └─────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
```

## Recommended Implementation (Option 4 - Enhanced):

### Visual Hierarchy:
1. **Header Row**: Avatar + Name + Action buttons
2. **Time**: Subtle, under name
3. **Contact Info**: Phone on its own line
4. **Business Info**: Interest + Address on same line with separator
5. **Query**: In subtle background box, italicized

### Color Scheme:
- Name: Bold, primary text
- Time: Green dot + secondary text
- Phone/Interest/Address: Regular text with subtle icons
- Query: Italic, in light background
- Icons: Muted colors

### Spacing:
- Tight vertical spacing (0.5-0.75rem gaps)
- Horizontal padding: 1.5rem
- Card padding: 1.5rem
- Query box padding: 0.75rem

### Interactive Elements:
- Entire card: Clickable (hover effect)
- Copy button: Hover shows tooltip
- Check button: Hover shows "Mark as Read"
- Phone: Could be clickable for tel: link

This design is:
- **Compact**: All info visible without scrolling
- **Scannable**: Clear visual hierarchy
- **Professional**: Clean, modern look
- **Functional**: Easy to copy/mark as read
- **Mobile-friendly**: Works on small screens