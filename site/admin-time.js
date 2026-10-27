// Central Time is the business-local timezone for the bakery in Nixa, Missouri.
// These helpers avoid interpreting bakery scheduling fields using the editor's device timezone.
const CENTRAL_TIMEZONE='America/Chicago';
const format=new Intl.DateTimeFormat('en-US',{
 timeZone:CENTRAL_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',
 hour:'2-digit',minute:'2-digit',hourCycle:'h23'
});
export function centralInputFromIso(value){
 if(!value)return '';
 const instant=new Date(value);
 if(Number.isNaN(instant.getTime()))throw Error('Invalid saved date/time');
 const p=Object.fromEntries(format.formatToParts(instant).map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute;
}
export function isoFromCentralInput(value){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Enter a complete date and time');
 const date=Date.parse(value+':00Z');
 if(!Number.isFinite(date))throw Error('Invalid cutoff date/time');
 // Missouri alternates between UTC-6 (standard) and UTC-5 (daylight).
 const candidates=[5,6].map(hours=>new Date(date+hours*3600000)).filter(d=>centralInputFromIso(d)===value);
 if(candidates.length!==1)throw Error(candidates.length?'This time occurs twice during the daylight saving transition. Choose a different time.':'This local time does not exist in Central Time. Choose another time.');
 return candidates[0].toISOString();
}
