/* =========================================================================
   Forum Portal — settings
   Edit this file to connect Google sign-in. See README, section 7.
   ========================================================================= */
window.FORUM_CONFIG = {
  // Your Google OAuth "Web application" Client ID, from Google Cloud Console.
  // Looks like: 1234567890-abc123def456.apps.googleusercontent.com
  // Leave empty until you have one; the sign-in button will say Google isn't connected yet.
  googleClientId: '',

  // Only these email domains may sign in, e.g. ['yourschool.org'].
  // Leave empty to allow any Google account (not recommended for a live site).
  allowedDomains: [],

  // Google accounts that are Forum members, with the title used in greetings
  // ("Hey President Silva"). Everyone else who signs in is a student.
  // Use lowercase emails.
  forumMembers: {
    // 'daniela.silva@yourschool.org': 'President',
    // 'kevin.zhang@yourschool.org': 'Representative'
  },

  // Show the "Explore with a demo account" section on the sign-in page.
  // Set to false once Google sign-in is working.
  showDemoAccounts: true
};
