package com.jry.base.ui.components;

/**
 * Central source of truth for priority labels and colors. Stage A ships fixed tiers
 * (1st/2nd/3rd) plus a generic fallback for any higher rank, so custom tiers (Stage B)
 * still render sensibly before their custom colors exist.
 *
 * Priority is a rank integer on Task: lower = more important. 1 = "1st", 2 = "2nd", etc.
 * null = no priority.
 */
public final class Priorities {

    private Priorities() {}

    /** Number of seeded default tiers (1st, 2nd, 3rd). */
    public static final int DEFAULT_TIER_COUNT = 3;

    /** Colors for the default tiers, indexed by rank-1. Red/orange/amber = hot to cool. */
    private static final String[] DEFAULT_COLORS = {
            "#fee2e2", // 1st — light red
            "#ffedd5", // 2nd — light orange
            "#fef9c3"  // 3rd — light yellow
    };

    /** Text colors paired with the backgrounds above, for contrast. */
    private static final String[] DEFAULT_TEXT_COLORS = {
            "#b91c1c", // 1st — deep red
            "#c2410c", // 2nd — deep orange
            "#a16207"  // 3rd — deep amber
    };

    /** Returns the short ordinal label for a rank: 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th"... */
    public static String label(int rank) {
        int mod100 = rank % 100;
        int mod10 = rank % 10;
        String suffix;
        if (mod100 >= 11 && mod100 <= 13) {
            suffix = "th";
        } else if (mod10 == 1) {
            suffix = "st";
        } else if (mod10 == 2) {
            suffix = "nd";
        } else if (mod10 == 3) {
            suffix = "rd";
        } else {
            suffix = "th";
        }
        return rank + suffix;
    }

    /** Background color for a rank. Default tiers use the palette; higher ranks fall back to grey. */
    public static String backgroundColor(int rank) {
        if (rank >= 1 && rank <= DEFAULT_COLORS.length) {
            return DEFAULT_COLORS[rank - 1];
        }
        return "#e5e7eb"; // neutral grey for custom/extra tiers (Stage B gives them real colors)
    }

    /** Text color for a rank, paired with backgroundColor for contrast. */
    public static String textColor(int rank) {
        if (rank >= 1 && rank <= DEFAULT_TEXT_COLORS.length) {
            return DEFAULT_TEXT_COLORS[rank - 1];
        }
        return "#374151"; // neutral dark grey
    }
}
