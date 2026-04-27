# Requirements Document

## Introduction

This document specifies the requirements for an admin live match tracking system for a sports dashboard application. The system enables administrators to manage upcoming and live matches, automatically detect match status transitions, display real-time scorecard data with player images, and provide comprehensive live match information across multiple sports (Cricket, Football, Basketball, Tennis).

## Glossary

- **Admin_Dashboard**: The administrative interface accessible only to authenticated admin users
- **User_Dashboard**: The public-facing dashboard accessible to all users
- **Live_Match**: A match currently in progress with real-time score updates
- **Upcoming_Match**: A scheduled match that has not yet started
- **Match_Scraper**: The backend service that extracts live match data from external URLs
- **Scorecard**: A detailed view of match statistics including batting, bowling, and live stats
- **Lounge**: A social feature where users can chat and interact during live matches
- **Auto_Promotion**: The automatic transition of an upcoming match to live status when detected
- **Polling_Service**: The background service that periodically checks match URLs for updates
- **FAB_Button**: Floating Action Button for adding matches in the admin interface
- **Player_Image_Resolver**: Service that maps player names to their image files
- **Match_End_Detector**: Service that identifies when a match has completed
- **Sport_Adapter**: Component that handles sport-specific data parsing and display logic

## Requirements

### Requirement 1: Admin Authentication and Authorization

**User Story:** As an admin, I want to log in with my credentials and access admin-only features, so that I can manage matches without exposing admin functionality to regular users.

#### Acceptance Criteria

1. WHEN an admin enters email "admin@gmail.com" and password "Harshdoshi1$", THE Authentication_Service SHALL authenticate the admin and grant admin role
2. WHEN authentication succeeds, THE System SHALL redirect the admin to the Admin_Dashboard
3. WHEN a non-admin user attempts to access /admin/* routes, THE System SHALL redirect them to the login page
4. THE System SHALL persist admin session state across page refreshes
5. WHEN an admin logs out, THE System SHALL clear the session and redirect to the login page

### Requirement 2: Admin Dashboard Interface

**User Story:** As an admin, I want to see a dashboard identical to the user dashboard but with admin controls, so that I can monitor matches while having quick access to management features.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display all content identical to the User_Dashboard
2. THE Admin_Dashboard SHALL render floating FAB_Buttons for adding matches
3. WHEN the admin views the cricket section, THE FAB_Button SHALL display a plus icon for adding cricket matches
4. WHEN the admin views other sport sections, THE FAB_Button SHALL display contextually appropriate icons
5. THE Admin_Dashboard SHALL be accessible only via /admin/dashboard route

### Requirement 3: Add Upcoming Match

**User Story:** As an admin, I want to add upcoming matches with their details, so that users can see scheduled matches and the system can auto-promote them when they start.

#### Acceptance Criteria

1. WHEN the admin clicks the FAB_Button in upcoming matches section, THE System SHALL display an Add_Upcoming_Match_Modal
2. THE Add_Upcoming_Match_Modal SHALL require URL, sport, section, title, date, and time fields
3. WHEN the admin submits valid upcoming match data, THE System SHALL save the match to the database
4. WHEN the admin submits invalid data, THE System SHALL display validation error messages
5. THE System SHALL display the newly added upcoming match in the User_Dashboard immediately after creation

### Requirement 4: Add Live Match

**User Story:** As an admin, I want to add live matches by providing a scraping URL, so that users can see real-time match data immediately.

#### Acceptance Criteria

1. WHEN the admin clicks the FAB_Button in live matches section, THE System SHALL display an Add_Live_Match_Modal
2. THE Add_Live_Match_Modal SHALL require URL, sport, section, and title fields
3. WHEN the admin submits valid live match data, THE Match_Scraper SHALL scrape the provided URL
4. WHEN scraping succeeds, THE System SHALL save the match with status "Live" and start 1-second polling
5. WHEN scraping fails, THE System SHALL display an error message with retry option

### Requirement 5: Auto Live Detection for Upcoming Matches

**User Story:** As a system, I want to automatically detect when upcoming matches start, so that they are promoted to live status without manual intervention.

#### Acceptance Criteria

1. THE Polling_Service SHALL poll each upcoming match URL every 60 seconds
2. WHEN the Polling_Service detects live match data at an upcoming match URL, THE System SHALL change the match status to "Live"
3. WHEN a match is promoted to live status, THE Polling_Service SHALL switch to 1-second polling for that match
4. THE Polling_Service SHALL continue polling until match end is detected
5. WHEN polling fails for an upcoming match, THE Polling_Service SHALL retry with exponential backoff up to 5 minutes

### Requirement 6: Live Match Polling

**User Story:** As a user, I want to see live match scores update in real-time, so that I can follow the match as it happens.

#### Acceptance Criteria

1. WHEN a match has status "Live", THE Polling_Service SHALL poll the match URL every 1 second
2. WHEN new match data is received, THE System SHALL update the match state in the central store
3. WHEN the frontend detects state changes, THE System SHALL re-render affected components within 100 milliseconds
4. THE System SHALL use useMemo and React.memo to prevent unnecessary re-renders
5. WHEN polling fails, THE System SHALL display a "Connection Lost" banner and retry after 2 seconds

### Requirement 7: Live Match Scorecard Redesign

**User Story:** As a user, I want to see a comprehensive live scorecard with all match details, so that I can understand the complete match situation at a glance.

#### Acceptance Criteria

1. THE MatchDetails_Page SHALL display a sticky header with team scores, overs, CRR, and win probability
2. THE MatchDetails_Page SHALL display a Live_Window panel showing current batters, bowler, and last 5 balls
3. THE MatchDetails_Page SHALL display a batting scorecard table with player names, runs, balls, strike rate, fours, and sixes
4. THE MatchDetails_Page SHALL display a bowling scorecard table with bowler names, overs, runs, wickets, economy, and best bowling figures
5. THE MatchDetails_Page SHALL display a match timeline showing fall of wickets with scores and overs
6. THE MatchDetails_Page SHALL display a projected score panel based on current run rate
7. THE MatchDetails_Page SHALL update all panels every 1 second when match is live

### Requirement 8: Lounge Real Scorecard

**User Story:** As a user in the lounge, I want to see a compact live scorecard with real data, so that I can follow the match while chatting with other fans.

#### Acceptance Criteria

1. THE LoungeRoom_Page SHALL display a mini score header with team logos, scores, and overs
2. THE LoungeRoom_Page SHALL display current partnership runs and balls
3. THE LoungeRoom_Page SHALL display last ball animation with run value or wicket indicator
4. THE LoungeRoom_Page SHALL display live batter stats with runs and balls faced
5. THE LoungeRoom_Page SHALL display live bowler stats with wickets and overs
6. THE LoungeRoom_Page SHALL display win probability bar chart
7. THE LoungeRoom_Page SHALL replace all dummy data with real scraped data
8. WHEN match data is unavailable, THE LoungeRoom_Page SHALL display "Data unavailable" message instead of dummy data

### Requirement 9: Match End Detection

**User Story:** As a system, I want to detect when matches end, so that I can stop polling and display final results.

#### Acceptance Criteria

1. WHEN the Match_End_Detector identifies match completion indicators in scraped data, THE System SHALL set match status to "Completed"
2. WHEN match status changes to "Completed", THE Polling_Service SHALL stop polling immediately
3. WHEN a match ends, THE System SHALL display a final result card with winner, final scores, and player of the match
4. THE System SHALL persist the final result state in the database
5. THE System SHALL display completed matches in a separate "Results" section on the dashboard

### Requirement 10: Player Images in Scorecard

**User Story:** As a user, I want to see player photos in the scorecard, so that I can visually identify players.

#### Acceptance Criteria

1. THE Player_Image_Resolver SHALL read the all players.txt file to build a player name to image mapping
2. WHEN rendering a player in a scorecard table, THE System SHALL display a circular image of 36×36 pixels
3. WHEN rendering a player in the live window, THE System SHALL display a circular image of 64×64 pixels
4. WHEN a player image is not found, THE System SHALL display a default avatar icon
5. THE Player_Image_Resolver SHALL normalize player names by removing special characters and converting to lowercase for matching

### Requirement 11: Cricket Sport Adapter

**User Story:** As a system, I want to parse and display cricket-specific data, so that cricket matches show detailed batting and bowling statistics.

#### Acceptance Criteria

1. THE Cricket_Sport_Adapter SHALL parse batting scorecard with player name, runs, balls, fours, sixes, and strike rate
2. THE Cricket_Sport_Adapter SHALL parse bowling scorecard with bowler name, overs, runs, wickets, economy, and best bowling
3. THE Cricket_Sport_Adapter SHALL parse live stats including CRR, required run rate, partnership, and last wicket
4. THE Cricket_Sport_Adapter SHALL parse match timeline with fall of wickets
5. THE Cricket_Sport_Adapter SHALL calculate win probability based on runs scored and wickets lost

### Requirement 12: Football Sport Adapter

**User Story:** As a system, I want to parse and display football-specific data, so that football matches show goals, scoreline, and possession.

#### Acceptance Criteria

1. THE Football_Sport_Adapter SHALL parse scoreline with team names and goals
2. THE Football_Sport_Adapter SHALL parse current match minute
3. THE Football_Sport_Adapter SHALL parse possession percentage for each team
4. THE Football_Sport_Adapter SHALL parse goal scorers with minute of goal
5. THE Football_Sport_Adapter SHALL display yellow and red cards with player names

### Requirement 13: Basketball Sport Adapter

**User Story:** As a system, I want to parse and display basketball-specific data, so that basketball matches show quarter scores and player stats.

#### Acceptance Criteria

1. THE Basketball_Sport_Adapter SHALL parse quarter scores for all four quarters
2. THE Basketball_Sport_Adapter SHALL parse total points for each team
3. THE Basketball_Sport_Adapter SHALL parse top scorers with points, rebounds, and assists
4. THE Basketball_Sport_Adapter SHALL parse current quarter and time remaining
5. THE Basketball_Sport_Adapter SHALL display team shooting percentages

### Requirement 14: Tennis Sport Adapter

**User Story:** As a system, I want to parse and display tennis-specific data, so that tennis matches show set scores and serve stats.

#### Acceptance Criteria

1. THE Tennis_Sport_Adapter SHALL parse set scores for all completed sets
2. THE Tennis_Sport_Adapter SHALL parse current game score
3. THE Tennis_Sport_Adapter SHALL parse serving player indicator
4. THE Tennis_Sport_Adapter SHALL parse aces and double faults for each player
5. THE Tennis_Sport_Adapter SHALL parse first serve percentage for each player

### Requirement 15: Generic Sport Adapter

**User Story:** As a system, I want to display basic score information for unsupported sports, so that any sport can be added without breaking the system.

#### Acceptance Criteria

1. WHEN a sport does not have a specific adapter, THE Generic_Sport_Adapter SHALL display team names and scores
2. THE Generic_Sport_Adapter SHALL display match status text
3. THE Generic_Sport_Adapter SHALL display venue and date information
4. THE Generic_Sport_Adapter SHALL display a message indicating detailed stats are not available
5. THE Generic_Sport_Adapter SHALL not throw errors when parsing unknown data formats

### Requirement 16: Error Handling and Retry Logic

**User Story:** As a user, I want the system to handle errors gracefully, so that temporary failures don't break my experience.

#### Acceptance Criteria

1. WHEN a scraping request fails, THE System SHALL retry up to 3 times with 2-second delays
2. WHEN all retries fail, THE System SHALL display an error message to the user
3. WHEN polling fails for a live match, THE System SHALL display a "Connection Lost" banner
4. WHEN polling resumes successfully, THE System SHALL hide the "Connection Lost" banner
5. THE System SHALL log all errors to the console with timestamp and match ID for debugging

### Requirement 17: Performance Optimization

**User Story:** As a user, I want the interface to remain responsive during live updates, so that I can interact with the app smoothly.

#### Acceptance Criteria

1. THE System SHALL use React.memo for all match card components
2. THE System SHALL use useMemo for computed values like win probability
3. THE System SHALL debounce rapid state updates to maximum 1 update per 500 milliseconds for non-critical UI elements
4. THE System SHALL use useEffect cleanup functions to cancel pending requests when components unmount
5. THE System SHALL limit the number of concurrent scraping requests to 5

### Requirement 18: Responsive Design

**User Story:** As a user on mobile or desktop, I want the interface to adapt to my screen size, so that I can use the app on any device.

#### Acceptance Criteria

1. THE System SHALL render mobile-optimized layouts for screens 375px wide
2. THE System SHALL render desktop-optimized layouts for screens 1280px and wider
3. THE System SHALL use responsive grid layouts that adapt between 1, 2, and 3 columns
4. THE System SHALL scale player images proportionally on all screen sizes
5. THE System SHALL hide non-essential UI elements on mobile to reduce clutter

### Requirement 19: TypeScript Type Safety

**User Story:** As a developer, I want strict TypeScript types throughout the codebase, so that I can catch errors at compile time.

#### Acceptance Criteria

1. THE System SHALL define TypeScript interfaces for all match data structures
2. THE System SHALL define TypeScript interfaces for all API response types
3. THE System SHALL not use the "any" type except in controlled error handling scenarios
4. THE System SHALL use TypeScript generics for reusable components
5. THE System SHALL pass TypeScript compilation with zero errors in production build

### Requirement 20: Data Persistence

**User Story:** As an admin, I want match data to persist across server restarts, so that I don't lose configured matches.

#### Acceptance Criteria

1. THE System SHALL store all match configurations in a database
2. THE System SHALL store match status (Upcoming, Live, Completed) in the database
3. WHEN the server restarts, THE System SHALL reload all active matches from the database
4. WHEN the server restarts, THE Polling_Service SHALL resume polling for all live and upcoming matches
5. THE System SHALL store final match results permanently in the database

