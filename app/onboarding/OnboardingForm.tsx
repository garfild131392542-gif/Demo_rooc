'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput } from '@/components/FormInput'
import { FormTextarea } from '@/components/FormTextarea'
import { ProgressBar } from '@/components/ProgressBar'
import { completeOnboardingAction, validateGuildUrlAction } from '../actions/onboarding'




interface GuildUrlStatus {
  checking: boolean
  available: boolean | null
  error?: string
}

export function OnboardingForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const [guildUrlStatus, setGuildUrlStatus] = useState<GuildUrlStatus>({
    checking: false,
    available: null,
  })

  const [formData, setFormData] = useState({
    guildName: '',
    guildUrl: '',
    guildDescription: '',
    discordLink: '',
    facebookLink: '',
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Debounced guild URL validation
  const validateGuildUrl = useCallback(
    async (url: string) => {
      if (!url || url.length < 3) {
        setGuildUrlStatus({ checking: false, available: null })
        return
      }

      setGuildUrlStatus({ checking: true, available: null })

      const result = await validateGuildUrlAction(url)
      setGuildUrlStatus({
        checking: false,
        available: result.available,
        error: result.error,
      })
    },
    []
  )

  // Debounce timer
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleGuildUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setFormData((prev) => ({ ...prev, guildUrl: value }))

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      validateGuildUrl(value)
    }, 500)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.guildName.trim()) {
        setError('Please enter a guild name')
        return
      }
      if (!formData.guildUrl.trim()) {
        setError('Please enter a guild URL')
        return
      }
      if (!guildUrlStatus.available) {
        setError('Guild URL is not available')
        return
      }
    } else if (currentStep === 2) {
      // Step 2 has optional fields, just proceed
    }

    setCurrentStep(currentStep + 1)
    setError(null)
  }

  const handleBack = () => {
    setCurrentStep(currentStep - 1)
    setError(null)
  }

  const handleSubmit = async () => {
    if (currentStep !== 3) return

    setIsLoading(true)
    setError(null)

    const result = await completeOnboardingAction({
      guildName: formData.guildName,
      guildUrl: formData.guildUrl,
      guildDescription: formData.guildDescription,
      discordLink: formData.discordLink || undefined,
      facebookLink: formData.facebookLink || undefined,
    })

    if (!result.success) {
      setError(result.error || 'Failed to complete onboarding')
      setIsLoading(false)
      return
    }

    // Show success
    setInviteLink(result.inviteLink || `${appUrl}/g/${formData.guildUrl}`)
  }

  const handleCopyInviteLink = async () => {
    if (inviteLink) {
      try {
        await navigator.clipboard.writeText(inviteLink)
        // Optional: show toast notification
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const handleGoToDashboard = () => {
    router.push('/profile-setup')
  }

  return (
    <div className="flex flex-col gap-6">
      <ProgressBar currentStep={currentStep} totalSteps={3} />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* STEP 1: Guild Info */}
      {currentStep === 1 && (
        <div className="flex flex-col gap-4">
          <FormInput
            label="Guild Name"
            name="guildName"
            placeholder="My Awesome Guild"
            value={formData.guildName}
            onChange={handleInputChange}
            required
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="guildUrl" className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Guild URL <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {appUrl}/g/
                  </span>
                </div>
              </div>
            </div>
            <input
              id="guildUrl"
              name="guildUrl"
              type="text"
              placeholder="my-guild"
              value={formData.guildUrl}
              onChange={handleGuildUrlChange}
              required
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2 text-sm">
              {guildUrlStatus.checking && (
                <span className="text-gray-500">🔄 Checking...</span>
              )}
              {!guildUrlStatus.checking && guildUrlStatus.available === true && (
                <span className="text-green-500 font-semibold">✅ Available</span>
              )}
              {!guildUrlStatus.checking && guildUrlStatus.available === false && (
                <span className="text-red-500 font-semibold">❌ Taken</span>
              )}
            </div>
          </div>

          <FormTextarea
            label="Guild Description"
            name="guildDescription"
            placeholder="Tell us about your guild..."
            value={formData.guildDescription}
            onChange={handleInputChange}
            rows={4}
          />

          <button
            onClick={handleNext}
            disabled={!guildUrlStatus.available || !formData.guildName.trim()}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* STEP 2: Contact Info */}
      {currentStep === 2 && (
        <div className="flex flex-col gap-4">
          <FormInput
            label="Discord Link"
            name="discordLink"
            type="url"
            placeholder="https://discord.gg/..."
            value={formData.discordLink}
            onChange={handleInputChange}
          />

          <FormInput
            label="Facebook Link"
            name="facebookLink"
            type="url"
            placeholder="https://facebook.com/groups/..."
            value={formData.facebookLink}
            onChange={handleInputChange}
          />

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Success Screen */}
      {currentStep === 3 && (
        <div className="flex flex-col gap-6 items-center py-8">
          {!inviteLink ? (
            <>
              <div className="text-6xl">✨</div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Ready to Go!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Let's finalize your guild setup
                </p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Setting up...' : 'Create Guild'}
              </button>
            </>
          ) : (
            <>
              <div className="text-6xl">🎉</div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Guild Created!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Share this link to invite members
                </p>
              </div>

              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm text-gray-900 dark:text-gray-100 break-all">
                    {inviteLink}
                  </code>
                  <button
                    onClick={handleCopyInviteLink}
                    className="shrink-0 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white px-3 py-1 rounded text-sm font-medium"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <button
                onClick={handleGoToDashboard}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                เริ่มใช้งาน Dashboard →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
