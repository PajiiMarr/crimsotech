import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import AxiosInstance from '~/components/axios/Axios';
import { redirect } from "react-router";


export async function registrationMiddleware(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const { request } = args;

  // Run only on the server
  const { getSession } = await import("../sessions.server");
  const session = await getSession(request.headers.get("Cookie"));

  let response;
  if(session.get("isRider") || session.get("isCustomer")) {
    response = await AxiosInstance.get('/get-registration/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if(response.data.is_rider){
      if(response.data.registration_stage == 1) throw redirect('/signup')
      if(response.data.registration_stage == 2) throw redirect('profiling'); 
      if(response.data.registration_stage == 3) throw redirect('/number')
      if(response.data.registration_stage == 4) return redirect('/rider')
    } else if (response.data.is_customer) {
      if(response.data.registration_stage == 1) throw redirect('/profiling')
      if(response.data.registration_stage == 2) throw redirect('/number')
      if(response.data.registration_stage == 4) return redirect('/home')
    }
  }
}
