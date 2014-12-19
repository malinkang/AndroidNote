require(["gitbook", "core/navigation"], function(gitbook, navigation) {
    gitbook.events.bind("page.change", function() {
        var prev = 0;

        $(".book-body .body-inner").scroll(function(e) {
            var y = $(e.target).scrollTop(); // offset of scroll
            var vH = $(e.target).height(); // size visible
            var h = $(e.target)[0].scrollHeight; // size of all content

            if ((y + vH) >= h) {
                navigation.goNext();
            } else if (y <= 0 && prev > 0) {
                navigation.goPrev();
            }

            prev = y;
        });
    });
});
