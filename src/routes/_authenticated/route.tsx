import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { StoreProvider } from '@/lib/store';
import { Shell } from '@/components/Shell';

export const Route = createFileRoute('/_authenticated')({
  ssr:false,
  beforeLoad:async()=>{const {data,error}=await supabase.auth.getUser();if(error || !data.user)throw redirect({to:'/auth'});},
  component:StudentLayout,
});
function StudentLayout(){return <StoreProvider><Shell><Outlet/></Shell></StoreProvider>;}