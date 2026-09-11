export const billingPeriods=['monthly','quarterly','half-yearly','yearly'] as const;
export const subscriptionPlans=[
 {id:'free',name:'Free',quarterly:0,description:'Your everyday film companion',features:['Film diary, ratings and watchlist','Personalized film recommendations','Community updates']},
 {id:'plus',name:'Plus',quarterly:75,description:'For the regular moviegoer',features:['Planned: more active movie alerts','Planned: priority notifications','Planned: alert reset options']},
 {id:'unlimited',name:'Unlimited',quarterly:125,description:'For a calendar full of cinema',features:['Planned: unlimited movie alerts','Planned: priority notifications','Planned: expanded alert controls']},
 {id:'pro-max',name:'Pro Max',quarterly:301,description:'For the biggest fans',features:['Planned: everything in Unlimited','Planned: sports ticket alerts','Planned: additional notification channels']},
] as const;
