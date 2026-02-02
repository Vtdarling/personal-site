# Fitness Coach Setup

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key


## Adding the API Key to Your Project

1. Open your `.env` file (create one if it doesn't exist in the project root)
2. Add this line:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. Replace `your_api_key_here` with your actual API key
4. Save the file
5. Restart your server

## Example .env File

```
MONGODB_URI=your_mongodb_connection_string
PORT=3000
GEMINI_API_KEY=AIzaSy...your_key_here
```

## Usage

- Navigate to the "Fitness" page in your app
- Ask for exercise or yoga recommendations
- Get AI-powered 10-20 minute workout suggestions
- Use quick prompts for common requests

## Features

✅ Morning yoga routines
✅ Home workouts (no equipment needed)
✅ Desk stretches for office workers
✅ Evening relaxation routines
✅ Custom exercise suggestions
