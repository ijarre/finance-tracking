import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://alafbdrprdubgavrspdx.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsYWZiZHJwcmR1YmdhdnJzcGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4OTAzODcsImV4cCI6MjA3OTQ2NjM4N30.daef1eZhpmy0vU2f0bjoJpMkOELr-22Og3afshwafJM";

export const supabase = createClient(supabaseUrl, supabaseKey);
