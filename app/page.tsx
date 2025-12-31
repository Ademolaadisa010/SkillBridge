import Image from "next/image";
import Link from "next/link";
import Hero from "@/public/hero-sec.jpg";
export default function Landingpage(){
  return(
    <div>
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35] to-[#2A9D8F] rounded-lg flex items-center justify-center">
                        <i className="fas fa-handshake text-white text-lg"></i>
                    </div>
                    <span className="text-xl font-bold text-dark">SkillBridge</span>
                </div>
                <div className="hidden md:flex items-center space-x-8">
                    <a href="#services" className="text-gray-700 hover:text-[#FF6B35] transition">Services</a>
                    <a href="#how-it-works" className="text-gray-700 hover:text-[#FF6B35] transition">How It Works</a>
                    <a href="#testimonials" className="text-gray-700 hover:text-[#FF6B35] transition">Testimonials</a>
                    <Link href="/login" className="text-gray-700 hover:text-[#FF6B35] transition">Login</Link>
                    <Link href="/register" className="bg-[#FF6B35] text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition">Get Started</Link>
                </div>
                <button className="md:hidden text-gray-700">
                    <i className="fas fa-bars text-xl"></i>
                </button>
            </div>
        </div>
      </nav>


      <section className="bg-gradient-to-br from-[#E9F5F3] via-white to-[#E9F5F3] py-12 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                  <div className="flex-1 text-center lg:text-left">
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-dark leading-tight mb-4 sm:mb-6">
                          Connect with <span className="text-[#FF6B35]">Trusted Skilled Workers</span> in Your Community
                      </h1>
                      <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto lg:mx-0">
                          Find verified plumbers, electricians, carpenters, mechanics, and more. Get quality work done by professionals you can trust.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                          <Link href="/login" className="bg-[#FF6B35] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-opacity-90 transition shadow-lg">
                              <i className="fas fa-search mr-2"></i>Find a Skilled Worker
                          </Link>
                          <Link href="/register" className="bg-white text-[#FF6B35] border-2 border-[#FF6B35] px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-[#FF6B35] hover:text-white transition">
                              <i className="fas fa-briefcase mr-2"></i>Join as a Worker
                          </Link>
                      </div>
                      <div className="flex items-center justify-center lg:justify-start gap-6 sm:gap-8 mt-6 sm:mt-8">
                          <div className="text-center">
                              <div className="text-2xl sm:text-3xl font-bold text-[#FF6B35]">5,000+</div>
                              <div className="text-xs sm:text-sm text-gray-600">Skilled Workers</div>
                          </div>
                          <div className="text-center">
                              <div className="text-2xl sm:text-3xl font-bold text-[#2A9D8F]">15,000+</div>
                              <div className="text-xs sm:text-sm text-gray-600">Jobs Completed</div>
                          </div>
                          <div className="text-center">
                              <div className="text-2xl sm:text-3xl font-bold text-[#F4A261]">4.8/5</div>
                              <div className="text-xs sm:text-sm text-gray-600">Average Rating</div>
                          </div>
                      </div>
                  </div>
                  <div className="flex-1 w-full max-w-lg">
                      <Image src={Hero} alt="Skilled workers" className="rounded-2xl shadow-2xl w-full h-64 sm:h-80 lg:h-96 object-cover"/>
                  </div>
              </div>
          </div>
        </section>

        <section id="services" className="py-12 sm:py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8 sm:mb-12">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#264653] mb-3 sm:mb-4">Popular Services</h2>
                    <p className="text-base sm:text-lg text-gray-600">Find the right professional for your needs</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-xl hover:shadow-lg transition cursor-pointer text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <i className="fas fa-wrench text-white text-xl sm:text-2xl"></i>
                        </div>
                        <h3 className="font-semibold text-[#264653] text-sm sm:text-base mb-1">Plumbing</h3>
                        <p className="text-xs sm:text-sm text-gray-600">850+ workers</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 sm:p-6 rounded-xl hover:shadow-lg transition cursor-pointer text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <i className="fas fa-bolt text-white text-xl sm:text-2xl"></i>
                        </div>
                        <h3 className="font-semibold text-[#264653] text-sm sm:text-base mb-1">Electrical</h3>
                        <p className="text-xs sm:text-sm text-gray-600">720+ workers</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 sm:p-6 rounded-xl hover:shadow-lg transition cursor-pointer text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <i className="fas fa-hammer text-white text-xl sm:text-2xl"></i>
                        </div>
                        <h3 className="font-semibold text-[#264653] text-sm sm:text-base mb-1">Carpentry</h3>
                        <p className="text-xs sm:text-sm text-gray-600">650+ workers</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 sm:p-6 rounded-xl hover:shadow-lg transition cursor-pointer text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <i className="fas fa-car text-white text-xl sm:text-2xl"></i>
                        </div>
                        <h3 className="font-semibold text-[#264653] text-sm sm:text-base mb-1">Mechanics</h3>
                        <p className="text-xs sm:text-sm text-gray-600">920+ workers</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-xl hover:shadow-lg transition cursor-pointer text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <i className="fas fa-paint-roller text-white text-xl sm:text-2xl"></i>
                        </div>
                        <h3 className="font-semibold text-[#264653] text-sm sm:text-base mb-1">Painting</h3>
                        <p className="text-xs sm:text-sm text-gray-600">580+ workers</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-6 rounded-xl hover:shadow-lg transition cursor-pointer text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <i className="fas fa-tools text-white text-xl sm:text-2xl"></i>
                        </div>
                        <h3 className="font-semibold text-[#264653] text-sm sm:text-base mb-1">Welding</h3>
                        <p className="text-xs sm:text-sm text-gray-600">430+ workers</p>
                    </div>
                </div>
            </div>
        </section>

        <section id="how-it-works" className="py-12 sm:py-16 bg-gradient-to-br from-[#E9F5F3] to-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8 sm:mb-12">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#264653] mb-3 sm:mb-4">How It Works</h2>
                    <p className="text-base sm:text-lg text-gray-600">Get started in three simple steps</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg text-center relative">
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-[#FF6B35] text-white rounded-full flex items-center justify-center font-bold text-xl">1</div>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#FF6B35] to-[#F4A261] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 mt-4">
                            <i className="fas fa-search text-white text-2xl sm:text-3xl"></i>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-[#264653] mb-2 sm:mb-3">Search & Browse</h3>
                        <p className="text-sm sm:text-base text-gray-600">Find skilled workers by service type, location, and ratings. View profiles, reviews, and past work.</p>
                    </div>
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg text-center relative">
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-[#2A9D8F] text-white rounded-full flex items-center justify-center font-bold text-xl">2</div>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#2A9D8F] to-teal-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 mt-4">
                            <i className="fas fa-calendar-check text-white text-2xl sm:text-3xl"></i>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-[#264653] mb-2 sm:mb-3">Book & Connect</h3>
                        <p className="text-sm sm:text-base text-gray-600">Send job requests with details, date, and location. Chat directly with workers to discuss your needs.</p>
                    </div>
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg text-center relative">
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-[#F4A261] text-white rounded-full flex items-center justify-center font-bold text-xl">3</div>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#F4A261] to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 mt-4">
                            <i className="fas fa-star text-white text-2xl sm:text-3xl"></i>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-dark mb-2 sm:mb-3">Get Work Done</h3>
                        <p className="text-sm sm:text-base text-gray-600">Work gets completed professionally. Rate and review to help others in the community.</p>
                    </div>
                </div>
            </div>
        </section>


        <section className="py-12 sm:py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 sm:mb-12 gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-dark mb-2">Top Rated Workers</h2>
                        <p className="text-base sm:text-lg text-gray-600">Verified professionals with excellent reviews</p>
                    </div>
                    <a href="#browse" className="text-primary font-semibold hover:underline flex items-center">
                        View All <i className="fas fa-arrow-right ml-2"></i>
                    </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition cursor-pointer">
                        <div className="relative h-48">
                            <Image src={Hero} alt="Worker" className="w-full h-full object-cover"/>
                            <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full flex items-center gap-1">
                                <i className="fas fa-star text-yellow-400 text-xs"></i>
                                <span className="text-sm font-semibold">4.9</span>
                            </div>
                            <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                <i className="fas fa-check-circle"></i> Verified
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-dark text-lg mb-1">Kwame Mensah</h3>
                            <p className="text-sm text-gray-600 mb-2">Master Electrician</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <i className="fas fa-map-marker-alt"></i>
                                <span>Accra, Ghana</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-primary font-bold">₦ 1,000/hr</span>
                                <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-90 transition">Book Now</button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition cursor-pointer">
                        <div className="relative h-48">
                            <Image src={Hero} alt="Worker" className="w-full h-full object-cover"/>
                            <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full flex items-center gap-1">
                                <i className="fas fa-star text-yellow-400 text-xs"></i>
                                <span className="text-sm font-semibold">4.8</span>
                            </div>
                            <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                <i className="fas fa-check-circle"></i> Verified
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-dark text-lg mb-1">Chidi Okafor</h3>
                            <p className="text-sm text-gray-600 mb-2">Professional Plumber</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <i className="fas fa-map-marker-alt"></i>
                                <span>Lagos, Nigeria</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-primary font-bold">₦ 900/hr</span>
                                <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-90 transition">Book Now</button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition cursor-pointer">
                        <div className="relative h-48">
                            <Image src={Hero} alt="Worker" className="w-full h-full object-cover"/>
                            <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full flex items-center gap-1">
                                <i className="fas fa-star text-yellow-400 text-xs"></i>
                                <span className="text-sm font-semibold">5.0</span>
                            </div>
                            <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                <i className="fas fa-check-circle"></i> Verified
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-dark text-lg mb-1">Amara Nkosi</h3>
                            <p className="text-sm text-gray-600 mb-2">Expert Carpenter</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <i className="fas fa-map-marker-alt"></i>
                                <span>Nairobi, Kenya</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-primary font-bold">₦ 1,000/hr</span>
                                <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-90 transition">Book Now</button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition cursor-pointer">
                        <div className="relative h-48">
                            <Image src={Hero} alt="Worker" className="w-full h-full object-cover"/>
                            <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full flex items-center gap-1">
                                <i className="fas fa-star text-yellow-400 text-xs"></i>
                                <span className="text-sm font-semibold">4.7</span>
                            </div>
                            <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                <i className="fas fa-check-circle"></i> Verified
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-dark text-lg mb-1">Thabo Dlamini</h3>
                            <p className="text-sm text-gray-600 mb-2">Auto Mechanic</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <i className="fas fa-map-marker-alt"></i>
                                <span>Johannesburg, SA</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-primary font-bold">₦ 800/hr</span>
                                <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-90 transition">Book Now</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>


        <section id="testimonials" className="py-12 sm:py-16 bg-gradient-to-br from-light to-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8 sm:mb-12">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-dark mb-3 sm:mb-4">What Our Users Say</h2>
                    <p className="text-base sm:text-lg text-gray-600">Real experiences from our community</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
                        <div className="flex items-center gap-1 mb-4">
                            <i className="fas fa-star text-yellow-400"></i>
                            <i className="fas fa-star text-yellow-400"></i>
                            <i className="fas fa-star text-yellow-400"></i>
                            <i className="fas fa-star text-yellow-400"></i>
                            <i className="fas fa-star text-yellow-400"></i>
                        </div>
                        <p className="text-gray-700 mb-6 text-sm sm:text-base">Found an amazing electrician through SkillBridge. He was professional, punctual, and did excellent work. The platform made it so easy to connect and book!</p>
                        <div className="flex items-center gap-3">
                            <Image src={Hero} alt="User" className="w-12 h-12 rounded-full object-cover"/>
                            <div>
                                <div className="font-semibold text-dark">Aisha Mohammed</div>
                                <div className="text-sm text-gray-500">Homeowner, Accra</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
                        <div className="flex items-center gap-1 mb-4">
                            <i className="fas fa-star text-yellow-400"></i>
                            <i className="fas fa-star text-yellow-400"></i>
                            <i className="fas fa-star text-yellow-400"></i>
                            <i className="fas fa-star text-yellow-400"></i>
                            <i className="fas fa-star text-yellow-400"></i>
                        </div>
                        <p className="text-gray-700 mb-6 text-sm sm:text-base">As a carpenter, this platform has transformed my business. I get consistent work, fair rates, and the verification system builds trust with clients. Highly recommend!</p>
                        <div className="flex items-center gap-3">
                            <Image src={Hero} alt="User" className="w-12 h-12 rounded-full object-cover"/>
                            <div>
                                <div className="font-semibold text-dark">Kofi Asante</div>
                                <div className="text-sm text-gray-500">Carpenter, Kumasi</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
                        <div className="flex items-center gap-1 mb-4">
                            <i className="fas fa-star text-yellow-400"></i>
                            <i className="fas fa-star text-yellow-400"></i>
                            <i className="fas fa-star text-yellow-400"></i>
                            <i className="fas fa-star text-yellow-400"></i>
                            <i className="fas fa-star text-yellow-400"></i>
                        </div>
                        <p className="text-gray-700 mb-6 text-sm sm:text-base">The chat feature and booking system are so convenient. I could discuss my plumbing issue, get a quote, and schedule everything without phone calls. Perfect!</p>
                        <div className="flex items-center gap-3">
                            <Image src={Hero} alt="User" className="w-12 h-12 rounded-full object-cover"/>
                            <div>
                                <div className="font-semibold text-dark">Fatima Diallo</div>
                                <div className="text-sm text-gray-500">Business Owner, Lagos</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>


        <section className="py-12 sm:py-16 bg-gradient-to-r from-[#FF6B35] to-[#2A9D8F]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">Ready to Get Started?</h2>
                <p className="text-base sm:text-lg text-white opacity-90 mb-6 sm:mb-8 max-w-2xl mx-auto">Join thousands of satisfied clients and skilled workers in our growing community</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/login" className="bg-white text-[#FF6B35] px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg">
                        Find Workers Now
                    </Link>
                    <Link href="/register" className="bg-transparent text-white border-2 border-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-white hover:text-[#FF6B35] transition">
                        Register as Worker
                    </Link>
                </div>
            </div>
        </section>


        <footer className="bg-[#264653] text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    <div>
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35] to-[#2A9D8F] rounded-lg flex items-center justify-center">
                                <i className="fas fa-handshake text-white text-lg"></i>
                            </div>
                            <span className="text-xl font-bold">SkillBridge</span>
                        </div>
                        <p className="text-gray-400 text-sm">Connecting skilled workers with clients across Africa. Building trust, one job at a time.</p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">For Clients</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-primary transition">Find Workers</a></li>
                            <li><a href="#" className="hover:text-primary transition">How It Works</a></li>
                            <li><a href="#" className="hover:text-primary transition">Safety Tips</a></li>
                            <li><a href="#" className="hover:text-primary transition">Pricing</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">For Workers</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-[#FF6B35] transition">Join as Worker</a></li>
                            <li><a href="#" className="hover:text-[#FF6B35] transition">Verification Process</a></li>
                            <li><a href="#" className="hover:text-[#FF6B35] transition">Success Stories</a></li>
                            <li><a href="#" className="hover:text-[#FF6B35] transition">Resources</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-[#FF6B35] transition">About Us</a></li>
                            <li><a href="#" className="hover:text-[#FF6B35] transition">Contact</a></li>
                            <li><a href="#" className="hover:text-[#FF6B35] transition">Help Center</a></li>
                            <li><a href="#" className="hover:text-[#FF6B35] transition">Terms & Privacy</a></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-700 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-400">© 2024 SkillBridge. All rights reserved.</p>
                    <div className="flex gap-4">
                        <a href="#" className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-[#FF6B35] transition">
                            <i className="fab fa-facebook-f"></i>
                        </a>
                        <a href="#" className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-[#FF6B35] transition">
                            <i className="fab fa-twitter"></i>
                        </a>
                        <a href="#" className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-[#FF6B35] transition">
                            <i className="fab fa-instagram"></i>
                        </a>
                        <a href="#" className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-[#FF6B35] transition">
                            <i className="fab fa-linkedin-in"></i>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    </div>
  )
}