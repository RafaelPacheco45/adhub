import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {createHandler} from './handler.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createHandler(db,['https://adhub-rafael.rp777045.chatgpt.site','https://rafaelpacheco45.github.io']));
