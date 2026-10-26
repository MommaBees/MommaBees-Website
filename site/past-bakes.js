// Display names derived from the bakery photos supplied by the Owner.
// No sale, price, product ID, or inventory data is created by an upload.
export const PAST_BAKE_IMAGE_NAMES=Object.freeze({
 '726495286_27539188345710992_2989486987874943902_n.jpg':'Bakery Creations — Photo Collection',
 '641606795_26269991649297341_1895014751577267796_n.jpg':'Caramel Pecan',
 '642451132_26269991615964011_9017971844218425441_n.jpg':'Carrot Cake',
 '642751501_26269991505964022_6627641265971632113_n.jpg':"Reese's",
 '642809307_26269991552630684_4007695198313813587_n.jpg':'Double Berry',
 '642830048_26269991565964016_3977431540319750092_n.jpg':'Strawberry Crunch',
 '643529388_26269991642630675_1278595281455263912_n.jpg':'Double Berry — Additional View',
 '643743191_26269991822630657_8199525641268525069_n.jpg':'Carrot Cake — Additional View',
 '644616216_26265521916410981_2835436890564589283_n.jpg':'Decorated Past Bake',
 '644705546_26269991599297346_9057823221797474557_n.jpg':'Cinnamon Roll',
 '644752030_26265521669744339_3002806035990584325_n.jpg':'Cinnamon Roll — Slice View',
 '644883996_26265521853077654_7079617051754829430_n.jpg':'Cinnamon Roll — Overhead View'
});
export const pastBakeName = filename =>
 PAST_BAKE_IMAGE_NAMES[filename] || filename.replace(/\.(jpe?g|png|webp)$/i,'').replace(/[_-]+/g,' ').trim().slice(0,100);
