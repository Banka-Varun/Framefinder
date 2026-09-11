export const billingPeriods=['monthly','quarterly','half-yearly','yearly'] as const;
export type BillingPeriod=typeof billingPeriods[number];
const prices=(monthly:number,quarterly:number,halfYearly:number,yearly:number)=>({monthly,quarterly,'half-yearly':halfYearly,yearly});
export const subscriptionPlans=[
 {id:'free',name:'Free',standardMonthly:0,prices:prices(0,0,0,0),description:'Your everyday film companion',features:['Film diary, ratings and watchlist','Personalized film recommendations','Community updates']},
 {id:'plus',name:'Plus',standardMonthly:30,prices:prices(25,75,140,250),description:'For the regular moviegoer',features:['Planned: more active movie alerts','Planned: priority notifications','Planned: alert reset options']},
 {id:'unlimited',name:'Unlimited',standardMonthly:50,prices:prices(45,125,225,400),description:'For a calendar full of cinema',features:['Planned: unlimited movie alerts','Planned: priority notifications','Planned: expanded alert controls']},
 {id:'pro-max',name:'Pro Max',standardMonthly:201,prices:prices(149,301,551,999),description:'For the biggest fans',features:['Planned: everything in Unlimited','Planned: sports ticket alerts','Planned: additional notification channels']},
] as const;
export function planPrice(plan:typeof subscriptionPlans[number],period:BillingPeriod){const months={monthly:1,quarterly:3,'half-yearly':6,yearly:12}[period];const standard=plan.standardMonthly*months,price=plan.prices[period];return {price,standard,savings:standard-price,months};}
export const periodLabels:Record<BillingPeriod,string>={monthly:'month',quarterly:'quarter','half-yearly':'6 months',yearly:'year'};
