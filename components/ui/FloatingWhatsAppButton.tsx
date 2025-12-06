// components/ui/FloatingWhatsAppButton.tsx
'use client'

import React from 'react'
import Image from 'next/image'

interface FloatingWhatsAppButtonProps {
  phoneNumber?: string
  message?: string
  className?: string
}

const FloatingWhatsAppButton: React.FC<FloatingWhatsAppButtonProps> = ({
  phoneNumber = '221781043505', // Numéro avec indicatif international pour le Sénégal
  message = "Bonjour, j'aimerais discuter de votre solution FayClick.",
  className = ''
}) => {
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        fixed bottom-5 right-5 z-[9999]
        flex items-center justify-center
        w-14 h-14 sm:w-16 sm:h-16
        bg-[#25D366] hover:bg-[#20BA5A]
        rounded-full shadow-lg hover:shadow-2xl
        transition-all duration-300 ease-in-out
        hover:scale-110 active:scale-95
        ${className}
      `}
      aria-label="Contacter via WhatsApp"
      title="Discutez avec nous sur WhatsApp"
    >
      <Image
        src="/images/whatsapp.png"
        alt="WhatsApp"
        width={36}
        height={36}
        className="w-8 h-8 sm:w-9 sm:h-9"
        priority
      />
    </a>
  )
}

export default FloatingWhatsAppButton
