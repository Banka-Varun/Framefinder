export function ticketStatus(status:string,review?:string|null){
 if(status==='pending_verification'){
  if(review==='approved')return {label:'Available',detail:'',approved:true};
  if(review==='needs_info')return {label:'More information needed',detail:'The administrator requested more booking information.',approved:false};
  if(review==='rejected')return {label:'Review rejected',detail:'The booking proof was not approved.',approved:false};
  return {label:'Awaiting review',detail:'Booking proof has not been approved yet.',approved:false};
 }
 const labels:Record<string,string>={verified:'Verified by issuer',reserved:'Checkout pending',completed:'Purchase confirmed',refunded:'Refunded',expired:'Expired',cancelled:'Cancelled',rejected:'Rejected'};
 return {label:labels[status]||status.replaceAll('_',' '),detail:'',approved:status==='verified'||status==='completed'};
}
