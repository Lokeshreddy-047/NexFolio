"use client";

interface Contributor {

  feature:string;

  impact:number;

}


export default function ShapContributors({

title,

items,

positive,

}:{

title:string;

items:Contributor[];

positive:boolean;

}){


return (

<div className="rounded-xl bg-slate-800 p-4">


<h3 className="font-semibold mb-4">

{title}

</h3>



<div className="space-y-3">


{
items.map(item=>{


const width =
Math.min(
100,
Math.abs(item.impact)*25
);



return (

<div key={item.feature}>


<div className="flex justify-between text-sm mb-1">


<span className="truncate">

{item.feature}

</span>


<span>

{item.impact.toFixed(4)}

</span>


</div>



<div className="h-2 bg-slate-700 rounded">


<div

className={`h-2 rounded ${
positive
?
"bg-red-400"
:
"bg-emerald-400"
}`}

style={{

width:`${width}%`

}}

/>


</div>


</div>


);


})

}



</div>


</div>

);

}