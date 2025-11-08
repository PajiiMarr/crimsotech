// import type React from 'react';
// import { useFetcher } from 'react-router';
// import { Label } from '~/components/ui/label';
// import { Input } from '~/components/ui/input';

// export function ProfilingOne({
//     className,
//     ...props
// }: React.ComponentProps<"form">) {
//     let fetcher = useFetcher();
//     const errors = fetcher.data?.errors;
//     return (
//         <div>
//             <fetcher.Form method="post" className="flex flex-col gap-6">
//                 <div className="flex flex-col items-center gap-2 text-center">
//                     <h1 className="text-2xl font-bold">Profiling Step 1</h1>
//                 </div>
//                 <div className="grid gap-6">
//                     <div className="grid gap-3">
//                         <Label htmlFor="username">Username</Label>
//                         <Input id="username" type="text" name="username" />
//                         {errors?.username && (
//                         <p className="px-1 text-xs text-red-600">
//                             {errors.username}
//                         </p>
//                         )}
//                     </div>
//                 </div>
//             </fetcher.Form>
//         </div>
//     )
// }