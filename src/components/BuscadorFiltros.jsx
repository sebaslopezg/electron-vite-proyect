import { useState, useEffect } from 'react'
import Form from 'react-bootstrap/Form'
import ListGroup from 'react-bootstrap/ListGroup'

export const BuscadorFiltros = ({ items, value, onChange, placeholder, disabled }) => {
    const [query, setQuery] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)

    useEffect(() => {
        const selectedItem = items.find(i => i.id === value)
        if (selectedItem) {
            setQuery(selectedItem.nombre)
        } else {
            setQuery('')
        }
    }, [value, items])

    const filteredItems = items.filter(item =>
        item.nombre.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 12)

    useEffect(() => {
        setActiveIndex(-1)
    }, [query])

    const handleKeyDown = (e) => {
        if (!showDropdown || filteredItems.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev))
        } 
        else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(prev => (prev > 0 ? prev - 1 : -1))
        } 
        else if (e.key === 'Enter') {
            e.preventDefault()
            if (activeIndex >= 0 && activeIndex < filteredItems.length) {
                const selected = filteredItems[activeIndex]
                onChange(selected.id)
                setShowDropdown(false)
            }
        } 
        else if (e.key === 'Escape') {
            setShowDropdown(false)
            setActiveIndex(-1)
        }
    }

    return (
        <div style={{ position: 'relative' }}>
            <Form.Control
                size="sm"
                type="text"
                placeholder={placeholder}
                value={query}
                disabled={disabled}
                onChange={(e) => {
                    setQuery(e.target.value)
                    setShowDropdown(true)
                    if (e.target.value === '') onChange('')
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (!disabled && items.length > 0) setShowDropdown(true) }}
                onBlur={() => {
                    setTimeout(() => {
                        setShowDropdown(false)
                        const selectedItem = items.find(i => i.id === value)
                        if (selectedItem) {
                            setQuery(selectedItem.nombre)
                        } else {
                            setQuery('')
                        }
                    }, 200)
                }}
                autoComplete="off"
            />
            {showDropdown && filteredItems.length > 0 && !disabled && (
                <ListGroup 
                    className="position-absolute shadow border border-1 border-secondary" 
                    style={{ zIndex: 9999, maxHeight: '180px', overflowY: 'auto', top: '100%', left: 0, width: '100%', marginTop: '4px' }}
                >
                    {filteredItems.map((item, index) => (
                        <ListGroup.Item 
                            key={item.id} 
                            action 
                            active={index === activeIndex}
                            className="py-1 px-2 small border-bottom"
                            style={{ cursor: 'pointer' }}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                onChange(item.id)
                                setShowDropdown(false)
                            }}
                        >
                            <span className={index === activeIndex ? "text-white fw-bold" : "text-dark"}>
                                {item.nombre}
                            </span>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            )}
        </div>
    )
}