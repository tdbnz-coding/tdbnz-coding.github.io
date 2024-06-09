document.addEventListener('DOMContentLoaded', function() {
    var images = [
        'https://i.postimg.cc/3RRpZsNR/IMG-6809.avif',
        'https://i.postimg.cc/3NynR4H3/image.png',
        'https://i.postimg.cc/W3xf068d/image.png',
        'https://i.postimg.cc/Gmz7X1zw/image.png',
        'https://i.postimg.cc/jjmh1q79/image.png',
        'https://i.postimg.cc/fWxvHNT2/image.png'
    ];

    var slideshowContainer = document.getElementById('slideshow');

    images.forEach(function(imageURL) {
        var slide = document.createElement('div');
        slide.classList.add('mySlides');
        slide.style.backgroundImage = 'url(' + imageURL + ')';
        slideshowContainer.appendChild(slide);
    });

    var slides = document.getElementsByClassName('mySlides');
    var slideIndex = 0;

    function showSlides() {
        for (var i = 0; i < slides.length; i++) {
            slides[i].style.display = 'none';
        }
        slideIndex++;
        if (slideIndex >= slides.length) { slideIndex = 0; }
        slides[slideIndex].style.display = 'block';
        slides[slideIndex].style.animation = 'slideToLeft 1s ease-in-out'; // Add transition effect
        setTimeout(showSlides, 20000); // Change image every 20 seconds
    }

    showSlides();
});
