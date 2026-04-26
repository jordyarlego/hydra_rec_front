import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';
import { recifeBairros } from '../data/recifeBairros';

export default function SearchableDropdown({ selectedCity, onCitySelect, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const filteredBairros = recifeBairros.filter(bairro =>
    bairro.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (bairro) => {
    onCitySelect(bairro);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="searchable-dropdown" ref={dropdownRef}>
      <div
        className={`search-input-box ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <Search size={20} className="search-icon" />
        <input
          type="text"
          placeholder={selectedCity || "Pesquisar bairro..."}
          value={isOpen ? searchTerm : ""}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          disabled={disabled}
        />
      </div>

      {isOpen && (
        <ul className="dropdown-list">
          {filteredBairros.length > 0 ? (
            filteredBairros.map(b => (
              <li key={b} onClick={() => handleSelect(b)}>
                <MapPin size={16} /> {b}
              </li>
            ))
          ) : (
            <li className="no-results">Nenhum bairro encontrado</li>
          )}
        </ul>
      )}
    </div>
  );
}
