/* AL METHER WORKFORCE - SUPABASE CONFIG */

const SUPABASE_URL = "https://peajqpwjtyvkkunfeyrv.supabase.co";

const SUPABASE_KEY = "sb_publishable_oUSOpwkWqEQ3OVM39RkNmQ_dcJ1PMci";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Supabase connected");