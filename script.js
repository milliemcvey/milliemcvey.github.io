var d = new Date();
var time = d.getHours();
var greeting;

if (time<12){
    greeting = "Good Morning!";
} else if (time>=12 && time<19){
    greeting = "Good Afternoon!";
} else if (time>=19){
    greeting = "Good Evening!";
} else{
    greeting ="Hello!";
}

document.getElementById("message").innerHTML = `<h2>${greeting}</h2>`;

