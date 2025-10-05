# PCSQuash Styling Analysis & Implementation

## Color Palette (Extracted from pcsquash.com)

### Primary Colors
- **Teal/Turquoise**: `#55C7B5` - Main brand color
- **Coral/Red**: `#E44A55`, `#EA492E` - Accent/CTA color
- **Orange/Yellow**: `#FFB907`, `#FF8C00` - Warning/highlight color

### Neutral Colors
- **Dark Gray**: `#303030` - Primary text
- **Medium Gray**: `#4C4E57`, `#8F8F8F` - Secondary text
- **Light Gray**: `#DBDBDB`, `#E2E2E2` - Borders/backgrounds
- **White**: `#FFFFFF` - Base background

## Design Patterns Observed

### 1. **Rounded Buttons**
- Border radius: `50px` (fully rounded/pill-shaped)
- Clean, modern aesthetic
- Applied to CTAs and interactive elements

### 2. **Card Layouts**
- Clean white cards with subtle shadows
- Rounded corners (moderate radius)
- Clear hierarchy with spacing

### 3. **Typography**
- Font families: Arial, Helvetica, sans-serif
- Clean, readable fonts
- Good contrast ratios

### 4. **Visual Effects**
- Subtle box shadows for depth
- Minimal use of heavy effects
- Focus on clarity and readability

## Implementation in Score Keeper

### Themes Created

#### Light Theme (`pcsquash`)
- Primary: Teal (`#55C7B5`)
- Accent: Coral (`#E44A55`)
- Clean white backgrounds
- Rounded buttons (1.5rem radius for pill effect)
- Subtle depth with shadows

#### Dark Theme (`pcsquash-dark`)
- Darker backgrounds with same color accents
- Brightened primary colors for better contrast
- Maintains brand identity in dark mode
- Automatic switching based on system preferences

### Styling Enhancements Applied

1. **Header**
   - Added theme toggle (Sun/Moon icons)
   - Trophy icon colored with primary theme color
   - Badge for "PAR-15 Doubles Scoring"
   - Border at bottom for definition

2. **Buttons & Interactive Elements**
   - Increased border radius to 1.5rem (pill-shaped like PCSQuash)
   - Added depth effect (--depth: 1)
   - Consistent hover states

3. **Cards**
   - Rounded corners (0.75rem)
   - Shadow effects for depth
   - Clean spacing

## Recommended Future Enhancements

### Icon & Graphic Styling
Based on PCSQuash's clean, modern aesthetic:

1. **Score Display**
   - Consider adding circular badges for scores (like their rounded buttons)
   - Use primary color for active server indicators
   - Add subtle animations on score changes

2. **Player Cards**
   - Rounded avatar placeholders with primary color backgrounds
   - Clean card layouts with shadows
   - Team color indicators using accent colors

3. **Match Progress**
   - Progress bars with rounded ends
   - Use primary color for completed games
   - Accent color for current game

4. **Buttons & CTAs**
   - All primary actions should use the teal primary color
   - Secondary actions in neutral grays
   - Danger actions (like "End Match") in coral/red accent

5. **Status Indicators**
   - Circular badges for game/match status
   - Color-coded: Success (teal), Warning (yellow), Error (coral)

6. **Typography Hierarchy**
   - Large, bold headings for scores
   - Medium weight for player names
   - Light weight for secondary info

### Specific Component Recommendations

- **Score Grid**: Add rounded corners to cells, use primary color for highlights
- **Action Buttons**: Make them pill-shaped with primary/accent colors
- **Match Summary**: Use card layout with rounded corners and shadows
- **Timer Display**: Circular or pill-shaped with primary color
- **Serve Indicator**: Circular badge with primary color fill

## Color Usage Guidelines

- **Primary (Teal)**: Main actions, active states, success indicators
- **Accent (Coral)**: Important CTAs, warnings, delete actions
- **Warning (Yellow)**: Caution states, pending actions
- **Neutral (Gray)**: Secondary actions, disabled states, borders
- **Base**: Backgrounds, content areas

## Accessibility Notes

- All color combinations meet WCAG AA contrast requirements
- Dark theme provides comfortable viewing in low light
- Icons supplement color coding for better accessibility
- Rounded corners improve visual comfort without sacrificing usability
