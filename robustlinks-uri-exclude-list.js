var RLuriPatternsToExclude = [
    "https?://dx.doi.org*",
    "https?://doi.org*",
    "https?://purl.org*",
    "https?://identifiers.org*",
    "https?://handle.net*",
    "https?://n2t.net*"
    //
    // Exclude additional URIs from receiving Robust Links
    // by adding them here:
    // - put the URI pattern between quotes
    // - put a comma after the closing quote except after the last URI pattern
    // - s? in the URI pattern means that the character s is optional
    // - g* in the URI pattern means that any number of characters may follow g
   //
];

