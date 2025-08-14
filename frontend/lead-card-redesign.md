# Lead Card Redesign Wireframe

## Proposed Layout

```
┌────────────────────────────────────────────────────────────┐
│      Kunal Test                             [📋] [✓]       │
│ [KT] • Today 2:24 PM                                       │
│ ─────────────────────────────────────────────────────────── │
│ 📞 +919991234567  •  🏢 Dealership                         │
│ 📍 Yamuna                                                   │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ "I am testing this to see how it looks and works"    │   │
│ └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

## Detailed Breakdown

### Header Row
```
         [Name]                    [Spacer]    [Copy Btn] [Check Btn]
[Avatar] [Time Dot + Time]
```
- **Avatar**: 40-42px circle with initials (spans both rows)
- **Name**: Bold, top row next to avatar
- **Time**: Green dot + time below name, subtle gray
- **Buttons**: Right-aligned in top row, good size (18-20px icons)

### Content Area (Full Width)
```
Phone • Interest
Address (if exists)
Query Box (if exists)
```

## Benefits of This Layout:
1. **Clean Header**: All key info and actions in one row
2. **Better Space Usage**: Content uses full width
3. **No Text Overlap**: Buttons won't interfere with content
4. **Clearer Hierarchy**: Header vs content clearly separated
5. **More Compact**: Less vertical space needed

## Visual Example:

```
┌────────────────────────────────────────────────────────────┐
│      Rajiv                                  [📋] [✓]       │
│ [R]  • Today 3:48 PM                                       │
│ ─────────────────────────────────────────────────────────── │
│ 📞 +919876543212  •  🏢 Architect                          │
│ 📍 ratest                                                   │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ "I am interested in testing it thrice"               │   │
│ └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│      Karan                                  [📋] [✓]       │
│ [K]  • Today 3:44 PM                                       │
│ ─────────────────────────────────────────────────────────── │
│ 📞 +911234561234  •  🏢 Dealership                         │
│ 📍 Mumrashtra                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ "Testing it twice to see how it is"                  │   │
│ └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│      Kunal Test                             [📋] [✓]       │
│ [KT] • Today 2:24 PM                                       │
│ ─────────────────────────────────────────────────────────── │
│ 📞 +919991234567  •  🏢 Dealership                         │
│ 📍 Yamuna                                                   │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ "I am testing this to see how it looks and works"    │   │
│ └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

## Implementation Notes:
- Use flexbox for header row with `space-between`
- Add subtle separator line below header
- Keep query box with accent border
- Maintain hover effects on buttons
- Keep card hover elevation effect

This design is cleaner, more organized, and prevents any overlap issues. What do you think?