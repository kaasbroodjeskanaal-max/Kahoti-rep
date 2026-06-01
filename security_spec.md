# Security Specification - Realtime Quiz App

This document outlines the security architecture, invariants, and threat analysis for the Real-time Quiz Application database fields on Firebase Firestore, conforming to Phase 0 of the Firebase Security hardener.

## Data Invariants

1. **Authentication Scope**: Quizzes can only be created by authenticated users. Users can join quiz sessions either anonymously or with Google Auth, but writing any player state requires a valid `request.auth.uid`.
2. **Author and Host Bounds**: A quiz's `creatorId` must be strictly set to the authenticated creator's UID and is immutable after creation.
3. **Session Coordination (Host Only)**: Only the designated session `hostId` can update global session parameters (such as `status`, `currentQuestionIndex`, `questionStartTime`).
4. **Player Access Separation**: A user can only create or edit their own player record, bounded by matching `playerId == request.auth.uid`.
5. **No Blind Updates**: Players are forbidden from changing other players' points or nicknames.
6. **Lobby Integrity**: Live sessions are readable by all to allow client code lookup. Player collections are readable by all in the session to facilitate real-time scoreboard synchronization.

---

## The "Dirty Dozen" Threat Payloads

The following scenarios must result in a `PERMISSION_DENIED` response from Firestore:

### Quiz Vulnerabilities
1. **Unauthenticated Quiz Creation**: Attempting to create a quiz in `/quizzes/{quizId}` without an auth token.
2. **Identity Spoofing on Quiz Create**: Creating a quiz with `creatorId = "different_user_123"` while authenticated as `user_abc`.
3. **Impersonated Quiz Deletion**: Attempting to delete a quiz owned by `user_abc` while signed in as `user_xyz`.
4. **Altering Creator Immutable Field**: Updating an existing quiz and attempting to change the `creatorId` from its original value.

### Session Vulnerabilities
5. **Session Hijacking (Host Spoofing)**: Creating a live session with `hostId = "hacker_user"` when the authenticated creator is `user_normal`.
6. **Unauthorized Session Control**: Updating a session's `currentQuestionIndex` or changing `status` to `question` when the authenticated user is NOT the host of that session.
7. **Bypassing State Transitions**: Modifying the session's code or deleting an active session as a normal player.

### Player Vulnerabilities
8. **Impersonated Player Registration**: Writing a player document in `/sessions/{sessionId}/players/{hackerId}` using a playerId of a different user.
9. **Score Corruption (Client Bloat)**: Directly editing another player's `score` field in real-time.
10. **Bypassing Nickname Character Limit**: Registering a player with a nickname exceeding 32 characters or empty string, or containing script injection.
11. **Answering Closed Quizzes**: Writing or changing `currentAnswerIndex` when the parent session's status is NOT `question`.
12. **Double Voting Injection**: Multiple concurrent updates trying to replace score parameters with massive values directly without bounds.

---

## Firestore Security Rules Architecture

Rules under `/firestore.rules` will implement:
- Strict `isValidQuiz()`, `isValidSession()`, and `isValidPlayer()` schema validators.
- Immutable guards: `incoming().creatorId == existing().creatorId` for Quizzes, and `incoming().hostId == existing().hostId` for Sessions.
- Relational sync rules for player score updates, verifying the updater's matching account ID.
