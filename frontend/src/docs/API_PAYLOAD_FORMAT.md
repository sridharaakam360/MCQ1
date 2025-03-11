# Test Submission API Payload Format

## Problem Analysis

We've been encountering persistent 400 Bad Request errors with the message "Missing required fields" when attempting to submit test results to the backend API.

The current payload format we've tried:

```javascript
{
  test_id: 'test_123',
  subject_id: 'subject_456',
  time_spent: 60,
  total_questions: 1,
  answers: [
    // Various formats attempted:
    { question_id: 1, selected_answer: 'A' },
    { questionId: 1, selectedAnswer: 'A' },
    { id: 1, answer: 'A' }
  ]
}
```

## Potential Solutions

### 1. Mock Implementation (Current Approach)

We've implemented a mock test submission service that bypasses the API entirely. This allows us to test the UI flow without relying on the backend. This is a temporary solution until we can resolve the API integration issues.

### 2. Backend API Documentation Review

We need to review the backend API documentation to understand the exact payload format expected by the `/tests/submit` endpoint. Key questions to answer:

- What are the required fields for the test submission payload?
- What is the expected format for the answers array?
- Are there any validation rules we're not aware of?

### 3. Potential Payload Formats to Try

Based on common REST API conventions, here are some payload formats to try:

#### Format 1: Flat Structure with Answer IDs
```javascript
{
  test_id: 'test_123',
  subject_id: 'subject_456',
  time_spent: 60,
  total_questions: 10,
  answers: {
    '1': 'A',
    '2': 'B',
    '3': 'C'
  }
}
```

#### Format 2: Nested Structure with Question Objects
```javascript
{
  test_id: 'test_123',
  subject_id: 'subject_456',
  time_spent: 60,
  questions: [
    {
      id: 1,
      selected_option: 'A'
    },
    {
      id: 2,
      selected_option: 'B'
    }
  ]
}
```

#### Format 3: Simple Array of Answer Objects
```javascript
{
  test_id: 'test_123',
  subject_id: 'subject_456',
  time_spent: 60,
  answers: [
    {
      question_id: 1,
      answer: 'A'
    },
    {
      question_id: 2,
      answer: 'B'
    }
  ]
}
```

## Next Steps

1. Continue using the mock implementation for UI testing
2. Request API documentation from the backend team
3. Implement a network request logger to capture the exact request payload and response
4. Try different payload formats with the backend API
5. Consider implementing a backend proxy for debugging
