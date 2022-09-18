import TextField from "@mui/material/TextField";
import {useEffect} from 'react';

const SearchBar = ({setSearchQuery, setShouldSearch, query, label}: {setSearchQuery: (query: string) => void, setShouldSearch: (shouldSearch: boolean) => void, query: string, label: string}) => {

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            query.length > 0 && setShouldSearch(true);
        }, 1500)

        return () => clearTimeout(delayDebounceFn)
    }, [query, setShouldSearch])

    return (
        <div style={{paddingBottom: 10}}>
            <TextField
                id="search-bar"
                className="text"
                onChange={(event) => {
                    setSearchQuery(event.currentTarget.value)
                }}
                variant="outlined"
                placeholder={`Search ${label}...`}
                size="small"
                value={query}
                sx={{backgroundColor: 'white'}}
                fullWidth={true}
            />
        </div>
    )
};

export default SearchBar;