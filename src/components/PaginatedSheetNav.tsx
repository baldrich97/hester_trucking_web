import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import KeyboardDoubleArrowLeft from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRight from "@mui/icons-material/KeyboardDoubleArrowRight";
import Button from "@mui/material/Button";
import Grid2 from "@mui/material/Unstable_Grid2";
import React from "react";
import {
    formatPaginatedPageLabel,
    getPaginatedLastPage,
} from "../utils/paginatedSheet";
import {calendarChevronNavSx, calendarWeekLabelSx} from "../theme/muiShared";

type PaginatedSheetNavProps = {
    page: number;
    grabCount: number;
    onPageChange: (nextPage: number) => void;
};

export default function PaginatedSheetNav({page, grabCount, onPageChange}: PaginatedSheetNavProps) {
    const lastPage = getPaginatedLastPage(grabCount);

    return (
        <Grid2 xs={2} sx={{display: "flex", justifyContent: "space-between"}}>
            <Button
                variant="text"
                type="button"
                size="small"
                sx={calendarChevronNavSx}
                aria-label="First page"
                onClick={() => onPageChange(1)}
                disabled={page === 1}
            >
                <KeyboardDoubleArrowLeft sx={{fontSize: 20}} />
            </Button>

            <Button
                variant="text"
                type="button"
                size="small"
                sx={calendarChevronNavSx}
                aria-label="Previous page"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
            >
                <ChevronLeft sx={{fontSize: 20}} />
            </Button>

            <Button
                variant="text"
                type="button"
                size="small"
                sx={calendarChevronNavSx}
                aria-label="Next page"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= lastPage}
            >
                <ChevronRight sx={{fontSize: 20}} />
            </Button>

            <Button
                variant="text"
                type="button"
                size="small"
                sx={calendarChevronNavSx}
                aria-label="Last page"
                onClick={() => onPageChange(lastPage)}
                disabled={page >= lastPage}
            >
                <KeyboardDoubleArrowRight sx={{fontSize: 20}} />
            </Button>

            <Button variant="text" type="button" size="small" sx={calendarWeekLabelSx}>
                <b style={{fontSize: 18}}>{formatPaginatedPageLabel(page, grabCount)}</b>
            </Button>
        </Grid2>
    );
}
