# Implementation Plan: Admin Live Match System

## Overview

This implementation plan breaks down the admin live match tracking system into discrete coding tasks. The system enables administrators to manage upcoming and live matches, automatically detect match status transitions, display real-time scorecard data with player images, and provide comprehensive live match information across multiple sports.

The implementation follows a phased approach: authentication and admin infrastructure first, then match management and scraping, followed by polling and auto-detection, scorecard redesign, and finally lounge integration and multi-sport support.

## Tasks

- [x] 1. Set up admin authentication and authorization infrastructure
  - Create admin authentication middleware with hardcoded credentials (admin@gmail.com / Harshdoshi1$)
  - Create admin auth context in frontend with session management
  - Implement protected route wrapper for /admin/* routes
  - Add admin session persistence in localStorage with expiration
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Create admin dashboard with FAB buttons
  - [x] 2.1 Create AdminDashboard component that wraps existing Dashboard
    - Import and render existing Dashboard component
    - Add floating FAB buttons (bottom-right, stacked vertically)
    - FAB 1: Add Upcoming Match (Clock icon) - position bottom-right + 80px
    - FAB 2: Add Live Match (Radio icon) - position bottom-right + 16px
    - Style FABs with gradient backgrounds and hover effects
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 2.2 Create AddUpcomingMatchModal component
    - Form fields: URL (text, required), Sport (select), Section (select), Title (text), Date (date picker), Time (time picker)
    - Implement form validation (URL format, future date, required fields)
    - Add loading spinner during submission
    - Display success/error messages
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 2.3 Create AddLiveMatchModal component
    - Form fields: URL (text, required), Sport (select), Section (select), Title (text)
    - Implement form validation (URL format, required fields)
    - Add loading spinner during scraping
    - Display success/error messages with retry button
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 2.4 Write unit tests for admin components
  - Test AdminDashboard shows FABs for admin users only
  - Test AddUpcomingMatchModal form validation
  - Test AddLiveMatchModal form validation and error handling
  - _Requirements: 2.1, 3.1, 4.1_

- [ ] 3. Implement backend admin API endpoints
  - [ ] 3.1 Create adminAuth middleware in backend/middleware/adminAuth.js
    - Validate email === 'admin@gmail.com' && password === 'Harshdoshi1$'
    - Set req.isAdmin = true on success
    - Return 401 on failure
    - _Requirements: 1.1_
  
  - [ ] 3.2 Create adminMatchController in backend/controllers/adminMatchController.js
    - Implement POST /api/admin/matches/upcoming endpoint
    - Implement POST /api/admin/matches/live endpoint
    - Implement DELETE /api/admin/matches/:id endpoint
    - Implement GET /api/admin/matches endpoint
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 3.3 Create admin routes in backend/routes/adminRoutes.js
    - Mount all admin endpoints with adminAuth middleware
    - Add CORS configuration for admin routes
    - Add rate limiting for admin endpoints
    - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 3.4 Write integration tests for admin API
  - Test POST /api/admin/matches/upcoming with valid data
  - Test POST /api/admin/matches/live with valid data
  - Test authentication rejection for invalid credentials
  - Test DELETE /api/admin/matches/:id
  - _Requirements: 1.1, 3.1, 4.1_

- [ ] 4. Implement match scraper service with sport adapters
  - [ ] 4.1 Create MatchScraperService in backend/services/matchScraperService.js
    - Implement scrapeMatch(url, sport) method using puppeteer
    - Implement detectMatchStatus(url) method
    - Add retry logic (3 attempts, 2s delay, exponential backoff)
    - Add request timeout (60 seconds)
    - _Requirements: 4.3, 4.4, 16.1, 16.2_
  
  - [ ] 4.2 Create CricketAdapter in backend/adapters/cricketAdapter.js
    - Implement parseMatch(html) to extract batting scorecard (player, runs, balls, 4s, 6s, SR)
    - Parse bowling scorecard (bowler, overs, runs, wickets, economy)
    - Parse live stats (CRR, RRR, partnership, last wicket)
    - Parse timeline (fall of wickets)
    - Calculate win probability based on runs and wickets
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ] 4.3 Create FootballAdapter in backend/adapters/footballAdapter.js
    - Parse scoreline (team names, goals)
    - Parse match minute and possession percentage
    - Parse goal scorers with minute
    - Parse cards (yellow, red) with player names
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [ ] 4.4 Create BasketballAdapter in backend/adapters/basketballAdapter.js
    - Parse quarter scores and total points
    - Parse top scorers (points, rebounds, assists)
    - Parse current quarter and time remaining
    - Parse shooting percentages
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 4.5 Create TennisAdapter in backend/adapters/tennisAdapter.js
    - Parse set scores and current game score
    - Parse serving player indicator
    - Parse aces and double faults
    - Parse first serve percentage
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ] 4.6 Create GenericAdapter in backend/adapters/genericAdapter.js
    - Parse team names and scores
    - Parse match status, venue, and date
    - Return minimal data structure
    - Never throw errors (graceful fallback)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 4.7 Write unit tests for sport adapters
  - Test CricketAdapter parses batting/bowling scorecard correctly
  - Test FootballAdapter parses scoreline and possession
  - Test BasketballAdapter parses quarter scores
  - Test TennisAdapter parses set scores
  - Test GenericAdapter handles unknown formats without errors
  - _Requirements: 11.1, 12.1, 13.1, 14.1, 15.1_

- [ ] 5. Implement polling service for live updates
  - [ ] 5.1 Create PollingService in backend/services/pollingService.js
    - Implement startPolling(matchId, interval) method
    - Implement stopPolling(matchId) method
    - Implement handleUpcomingMatch(matchId) with 60s polling
    - Implement handleLiveMatch(matchId) with 1s polling
    - Store polling intervals in Map for management
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2_
  
  - [ ] 5.2 Implement auto-live detection logic
    - Check match status on each poll for upcoming matches
    - When status changes to "Live", update database
    - Switch polling interval from 60s to 1s
    - Log status change events
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 5.3 Implement match end detection logic
    - Check for completion indicators in scraped data
    - When match ends, update status to "Completed"
    - Stop polling immediately
    - Store final result in database
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ] 5.4 Implement server restart recovery
    - Create restorePollingOnStartup() method
    - Load all active matches (Upcoming, Live) from database on server start
    - Resume polling for each match with appropriate interval
    - _Requirements: 20.3, 20.4_

- [ ]* 5.5 Write integration tests for polling service
  - Test startPolling creates interval and polls URL
  - Test stopPolling clears interval
  - Test auto-live detection changes status and interval
  - Test match end detection stops polling
  - Test server restart recovery loads active matches
  - _Requirements: 5.1, 5.2, 9.1, 20.3_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Create player image resolver service
  - [ ] 7.1 Create PlayerImageResolver in backend/services/playerImageResolver.js
    - Read public/assets/players/all players.txt file
    - Parse each line to build player name → image path map
    - Implement normalizePlayerName(name) method (lowercase, remove special chars, replace spaces with hyphens)
    - Implement resolvePlayerImage(name) method
    - Return null for missing players
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 7.2 Integrate PlayerImageResolver into sport adapters
    - Add image field to Batter and Bowler interfaces
    - Call resolvePlayerImage for each player in parsed data
    - Attach image path to player objects
    - _Requirements: 10.2, 10.3, 10.4_

- [ ]* 7.3 Write unit tests for player image resolver
  - Test exact name match returns correct image path
  - Test normalized name match returns correct image path
  - Test missing player returns null
  - Test special characters are handled correctly
  - _Requirements: 10.1, 10.5_

- [ ] 8. Redesign match details page with comprehensive scorecard
  - [ ] 8.1 Create sticky header component
    - Display team logos (48×48px), names, scores, overs
    - Display CRR, RRR (if chasing)
    - Display win probability bar with gradient
    - Add pulsing red dot for live indicator
    - Make header sticky on scroll
    - _Requirements: 7.1_
  
  - [ ] 8.2 Create live window component
    - Display current striker: name, runs, balls, SR, player image (64×64px)
    - Display non-striker: name, runs, balls, SR, player image (64×64px)
    - Display current bowler: name, overs, runs, wickets, economy, player image (64×64px)
    - Display last 6 balls with visual representation (dots for runs, W for wicket)
    - Display partnership (runs and balls)
    - Display last wicket (player name, runs, balls)
    - _Requirements: 7.2_
  
  - [ ] 8.3 Create batting scorecard table component
    - Columns: Player (with 36×36px image), Runs, Balls, 4s, 6s, SR
    - Use DataTable component with TypeScript generics
    - Add sorting by runs
    - Style with GlassCard
    - _Requirements: 7.3_
  
  - [ ] 8.4 Create bowling scorecard table component
    - Columns: Bowler (with 36×36px image), Overs, Runs, Wickets, Economy, Best
    - Use DataTable component with TypeScript generics
    - Add sorting by wickets
    - Style with GlassCard
    - _Requirements: 7.3_
  
  - [ ] 8.5 Create match timeline component
    - Horizontal timeline with wicket markers
    - Each marker shows: player name, runs, balls, score at fall, over
    - Visual representation of innings progression
    - _Requirements: 7.5_
  
  - [ ] 8.6 Create projected score panel component
    - Calculate projections based on current run rate
    - Show projections for 40 overs and 50 overs
    - Display multiple scenarios (current RR, 5.0, 5.5, 6.0)
    - _Requirements: 7.6_
  
  - [ ] 8.7 Integrate all components into MatchDetails page
    - Arrange components in vertical layout
    - Add 1-second polling for live matches
    - Use React.memo for all components
    - Use useMemo for computed values (win probability, projections)
    - Add loading states and error handling
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ]* 8.8 Write component tests for scorecard components
  - Test sticky header renders team scores correctly
  - Test live window displays current batters and bowler
  - Test batting table renders player images
  - Test bowling table renders bowler stats
  - Test timeline displays wicket markers
  - Test projected score calculations
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 9. Integrate real scorecard data into lounge room
  - [ ] 9.1 Update LoungeRoom component to fetch live match data
    - Add useEffect hook to poll match details every 2 seconds
    - Store match data in component state
    - Handle loading and error states
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [ ] 9.2 Replace dummy data in mini score header
    - Use real team logos, scores, overs from match data
    - Display real current partnership (runs and balls)
    - Display real last ball animation
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 9.3 Replace dummy data in live batter/bowler stats
    - Display real batter stats (runs, balls) with player images (48×48px)
    - Display real bowler stats (wickets, overs) with player image (48×48px)
    - Calculate real win probability based on scores
    - _Requirements: 8.4, 8.5, 8.6_
  
  - [ ] 9.4 Add fallback for missing data
    - Show "Data unavailable" message when match data is missing
    - Never show dummy data
    - Maintain layout consistency with placeholders
    - _Requirements: 8.8_

- [ ]* 9.5 Write component tests for lounge scorecard
  - Test mini score header displays real data
  - Test live batter/bowler stats display real data
  - Test win probability calculation
  - Test "Data unavailable" fallback
  - _Requirements: 8.1, 8.4, 8.8_

- [ ] 10. Implement error handling and retry logic
  - [ ] 10.1 Add retry logic to match scraper
    - Retry up to 3 times with 2-second delays
    - Use exponential backoff (2s, 4s, 8s)
    - Show error message after 3 failures
    - Add manual retry button in UI
    - _Requirements: 16.1, 16.2_
  
  - [ ] 10.2 Add connection lost banner component
    - Create ConnectionBanner component
    - Show yellow banner at top when polling fails
    - Display "Connection Lost - Retrying..." message
    - Auto-hide when connection restored
    - _Requirements: 16.3, 16.4_
  
  - [ ] 10.3 Implement graceful degradation
    - Show "Data unavailable" for missing scorecard data
    - Display basic match info when detailed stats unavailable
    - Hide missing sections instead of showing errors
    - Show default avatar for missing player images
    - _Requirements: 16.5_

- [ ]* 10.4 Write integration tests for error handling
  - Test retry logic retries 3 times before failing
  - Test connection lost banner appears on polling failure
  - Test graceful degradation shows fallback UI
  - Test default avatar displays for missing player images
  - _Requirements: 16.1, 16.3, 16.5_

- [ ] 11. Implement performance optimizations
  - [ ] 11.1 Add React.memo to all match card components
    - Wrap MatchCard with React.memo
    - Implement custom comparison function for props
    - Only re-render when match data changes
    - _Requirements: 17.1_
  
  - [ ] 11.2 Add useMemo for computed values
    - Memoize win probability calculation
    - Memoize projected score calculations
    - Memoize filtered/sorted lists
    - _Requirements: 17.2_
  
  - [ ] 11.3 Add useCallback for event handlers
    - Memoize handleMatchUpdate callback
    - Memoize handlePollingError callback
    - Prevent unnecessary re-renders of child components
    - _Requirements: 17.2_
  
  - [ ] 11.4 Implement debouncing for non-critical updates
    - Debounce commentary updates (500ms)
    - Debounce timeline updates (500ms)
    - Keep score updates immediate
    - _Requirements: 17.3_
  
  - [ ] 11.5 Add request limiting for concurrent scraping
    - Limit to 5 concurrent scraping requests
    - Queue additional requests
    - Process queue as requests complete
    - _Requirements: 17.5_

- [ ]* 11.6 Write performance tests
  - Test UI updates within 100ms of data change
  - Test 10 concurrent live matches without degradation
  - Test memory usage stays under 50MB increase
  - Test debouncing reduces re-render count
  - _Requirements: 17.1, 17.2, 17.3_

- [ ] 12. Implement responsive design for mobile and desktop
  - [ ] 12.1 Add mobile optimizations for match details
    - Stack scorecard sections vertically on mobile
    - Reduce player image size to 32×32px in tables
    - Hide non-essential columns (4s, 6s) on mobile
    - Collapse timeline to compact view
    - _Requirements: 18.1, 18.2_
  
  - [ ] 12.2 Add mobile optimizations for admin FAB buttons
    - Reduce FAB size to 48×48px on mobile
    - Maintain 12px gap between buttons
    - Position with 16px margin from edges
    - _Requirements: 18.1, 18.2_
  
  - [ ] 12.3 Add mobile optimizations for lounge scorecard
    - Single column layout on mobile
    - Reduce player images to 40×40px
    - Hide win probability bar on very small screens (<375px)
    - _Requirements: 18.1, 18.2_
  
  - [ ] 12.4 Add desktop enhancements
    - Two-column layout for scorecard sections
    - Larger player images (48×48px in tables, 80×80px in live window)
    - Show all columns in tables
    - Expanded timeline with player photos
    - Larger FAB buttons (64×64px) with hover effects
    - _Requirements: 18.3, 18.4, 18.5_

- [ ]* 12.5 Write responsive design tests
  - Test mobile layout renders correctly at 375px
  - Test tablet layout renders correctly at 768px
  - Test desktop layout renders correctly at 1280px
  - Test FAB button sizes adjust correctly
  - _Requirements: 18.1, 18.2_

- [ ] 13. Implement data persistence and database schema
  - [ ] 13.1 Create database migration for matches table
    - Create matches table with all required columns
    - Add indexes for status, sport, date
    - Add JSONB column for scoreboard data
    - _Requirements: 20.1, 20.2_
  
  - [ ] 13.2 Implement database queries in adminMatchController
    - Create insertMatch query for adding matches
    - Create updateMatch query for status changes
    - Create deleteMatch query for removing matches
    - Create getActiveMatches query for server restart
    - _Requirements: 20.1, 20.2, 20.3_
  
  - [ ] 13.3 Integrate database with polling service
    - Save match data to database on each poll
    - Update status in database when changed
    - Store final result in database when match ends
    - _Requirements: 20.2, 20.3, 20.4, 20.5_
  
  - [ ] 13.4 Implement server restart recovery
    - Call restorePollingOnStartup() in server.js on startup
    - Load all active matches from database
    - Resume polling for each match
    - _Requirements: 20.3, 20.4_

- [ ]* 13.5 Write integration tests for data persistence
  - Test match data is saved to database
  - Test status changes are persisted
  - Test server restart recovery loads active matches
  - Test final results are stored permanently
  - _Requirements: 20.1, 20.2, 20.3, 20.5_

- [ ] 14. Add TypeScript type safety throughout codebase
  - [ ] 14.1 Define TypeScript interfaces for all data models
    - Create Match interface
    - Create Scoreboard interface
    - Create Inning, Batter, Bowler, LiveStats interfaces
    - Create AdminSession interface
    - _Requirements: 19.1_
  
  - [ ] 14.2 Define TypeScript interfaces for API responses
    - Create MatchResponse interface
    - Create ScorecardResponse interface
    - Create ErrorResponse interface
    - _Requirements: 19.2_
  
  - [ ] 14.3 Add type guards for runtime type checking
    - Create isLiveMatch type guard
    - Create isCricketScoreboard type guard
    - Create isValidMatchStatus type guard
    - _Requirements: 19.1, 19.2_
  
  - [ ] 14.4 Use TypeScript generics for reusable components
    - Add generic type parameter to DataTable component
    - Add generic type parameter to Modal component
    - Ensure type safety in component props
    - _Requirements: 19.4_
  
  - [ ] 14.5 Ensure zero TypeScript compilation errors
    - Fix all TypeScript errors in codebase
    - Remove all "any" types except in controlled error handling
    - Run TypeScript compiler in strict mode
    - _Requirements: 19.3, 19.5_

- [ ]* 14.6 Write type safety tests
  - Test type guards correctly identify types
  - Test generic components accept correct types
  - Test TypeScript compilation passes with zero errors
  - _Requirements: 19.1, 19.2, 19.5_

- [ ] 15. Final integration and testing
  - [ ] 15.1 Test complete admin workflow end-to-end
    - Login as admin → Add upcoming match → Verify polling starts → Match goes live → Verify 1s polling → Match ends → Verify polling stops
    - _Requirements: 1.1, 3.1, 5.1, 9.1_
  
  - [ ] 15.2 Test complete user workflow end-to-end
    - View dashboard → See live match → Click match → View scorecard → Join lounge → See real data
    - _Requirements: 7.1, 8.1, 8.4_
  
  - [ ] 15.3 Test error scenarios
    - Test scraping failure with retry
    - Test connection lost with banner
    - Test missing player images with fallback
    - Test invalid admin credentials
    - _Requirements: 16.1, 16.3, 16.5, 1.1_
  
  - [ ] 15.4 Test performance under load
    - Test 10 concurrent live matches
    - Test 1-second polling performance
    - Test memory usage over time
    - _Requirements: 17.1, 17.2, 17.5_

- [ ] 16. Checkpoint - Final verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Documentation and deployment preparation
  - [ ] 17.1 Update README with admin credentials and setup instructions
    - Document admin login credentials
    - Document how to add matches
    - Document polling intervals and behavior
    - _Requirements: 1.1, 3.1, 5.1_
  
  - [ ] 17.2 Add environment variables documentation
    - Document ADMIN_EMAIL and ADMIN_PASSWORD
    - Document DATABASE_URL and REDIS_URL
    - Document POLLING_INTERVAL_UPCOMING and POLLING_INTERVAL_LIVE
    - Document MAX_CONCURRENT_SCRAPES
    - _Requirements: 1.1, 5.1, 17.5_
  
  - [ ] 17.3 Create deployment checklist
    - Database migration steps
    - Environment variable configuration
    - Server restart recovery verification
    - Performance monitoring setup
    - _Requirements: 20.1, 20.3_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- The implementation uses TypeScript for frontend and JavaScript for backend (matching existing codebase)
- All sport adapters follow the same interface pattern for consistency
- Polling service is designed to be resilient with automatic recovery
- Performance optimizations are critical for smooth 1-second updates
- Responsive design ensures usability on all devices
- Data persistence enables server restart recovery without data loss
------------